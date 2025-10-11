/**
 * Import October Participants from CSV
 *
 * Purpose: Import real participants from Airtable CSV export to Firebase
 *
 * CSV Fields Mapping:
 * - 이름 → name
 * - 성별 → gender (남/여 → male/female)
 * - 연락처 → phoneNumber (clean +82/010 format)
 * - 회사/하는일 → occupation
 * - 프로필 → profileImageCircle (Airtable URL)
 * - 생년월일 → (stored for reference, not in schema)
 *
 * Usage:
 *   tsx src/scripts/import-october-participants.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = require('../../firebase-service-account.json');

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const storage = getStorage();

interface CSVRow {
  이름: string;
  Created: string;
  성별: string;
  셀카: string;
  학력: string;
  연락처: string;
  생년월일: string;
  '회사/하는일': string;
  유입채널: string;
  '인터뷰 결과': string;
  '인터뷰 결과 알림 발송': string;
  '결제 여부': string;
  '현금영수증 요청': string;
  '현금영수증 발행': string;
  프로필: string;
  프로필수정요청: string;
  '수정 반영': string;
  '인터뷰 날짜': string;
  특이사항: string;
  '인터뷰(Tiro)': string;
  대화내용: string;
  '추천인 여부': string;
  '원하는 책': string;
}

// Clean phone number to standard format
function cleanPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Handle +82 prefix
  if (cleaned.startsWith('82')) {
    cleaned = '0' + cleaned.substring(2);
  }

  // Ensure it starts with 010
  if (!cleaned.startsWith('010')) {
    throw new Error(`Invalid phone number format: ${phone}`);
  }

  return cleaned;
}

// Extract image URL from Airtable format
function extractImageUrl(imageField: string): string | null {
  if (!imageField || imageField.trim() === '') {
    return null;
  }

  // Format: "filename.png (https://...)"
  const match = imageField.match(/\(https:\/\/[^\)]+\)/);
  if (match) {
    return match[0].slice(1, -1); // Remove parentheses
  }

  // Direct URL
  if (imageField.startsWith('http')) {
    return imageField;
  }

  return null;
}

// Map gender from Korean to English
function mapGender(gender: string): 'male' | 'female' | undefined {
  const cleaned = gender.trim();
  if (cleaned === '남') return 'male';
  if (cleaned === '여') return 'female';
  return undefined;
}

// Generate participant ID from name
function generateParticipantId(name: string, phoneNumber: string): string {
  // Use last 4 digits of phone + name
  const phoneSuffix = phoneNumber.slice(-4);
  const cleanName = name.replace(/\s/g, '').toLowerCase();
  return `${cleanName}-${phoneSuffix}`;
}

// Download and upload image to Firebase Storage
async function uploadProfileImage(
  imageUrl: string,
  participantId: string
): Promise<string> {
  try {
    console.log(`   📥 Downloading image from: ${imageUrl.substring(0, 50)}...`);

    // Download image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';

    // Determine file extension
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';

    const fileName = `${participantId}.${extension}`;
    const filePath = `profile_images/${fileName}`;

    // Upload to Firebase Storage
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType,
      },
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    console.log(`   ✅ Uploaded to: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error(`   ❌ Failed to upload image:`, error);
    throw error;
  }
}

async function importParticipants() {
  console.log('🚀 October Participants Import Script');
  console.log('═══════════════════════════════════════════════════════\n');

  // Read CSV file
  const csvPath = '/Users/jclee/Downloads/10월 멤버십-10월 멤버 리스트.csv';
  console.log(`📄 Reading CSV from: ${csvPath}\n`);

  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV (skip BOM if present)
  const records = parse(fileContent.replace(/^\uFEFF/, ''), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  console.log(`📊 Found ${records.length} total records\n`);

  // Filter only approved and paid participants
  const validRecords = records.filter((row) => {
    const isApproved = row['인터뷰 결과']?.trim() === '합격';
    const isPaid = row['결제 여부']?.trim() === '결제 완료';
    return isApproved && isPaid;
  });

  console.log(`✅ ${validRecords.length} approved & paid participants\n`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Get the active cohort (assume the latest one)
  const cohortsSnapshot = await db
    .collection('cohorts')
    .where('isActive', '==', true)
    .limit(1)
    .get();

  if (cohortsSnapshot.empty) {
    console.error('❌ No active cohort found!');
    console.log('   Please create a cohort first with npm run seed:cohorts');
    process.exit(1);
  }

  const cohortId = cohortsSnapshot.docs[0].id;
  const cohortName = cohortsSnapshot.docs[0].data().name;
  console.log(`🎯 Target Cohort: ${cohortName} (${cohortId})\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < validRecords.length; i++) {
    const row = validRecords[i];
    const rowNum = i + 1;

    try {
      const name = row['이름']?.trim();
      const phoneRaw = row['연락처']?.trim();

      if (!name || !phoneRaw) {
        console.log(`⚠️  [${rowNum}/${validRecords.length}] Skipping: Missing name or phone`);
        skipCount++;
        continue;
      }

      console.log(`\n🔄 [${rowNum}/${validRecords.length}] Processing: ${name}`);

      // Clean phone number
      const phoneNumber = cleanPhoneNumber(phoneRaw);
      console.log(`   📞 Phone: ${phoneNumber}`);

      // Check if participant already exists
      const existingSnapshot = await db
        .collection('participants')
        .where('phoneNumber', '==', phoneNumber)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        console.log(`   ⏭️  Already exists, skipping`);
        skipCount++;
        continue;
      }

      // Generate participant ID
      const participantId = generateParticipantId(name, phoneNumber);
      console.log(`   🆔 ID: ${participantId}`);

      // Extract profile image URL (Airtable URLs are expired, skip for now)
      // Images can be added manually later via Firebase Console or update script
      const uploadedImageUrl: string | undefined = undefined;
      console.log(`   📷 Profile image: Will be added manually later`);

      // Create participant document (only include defined fields)
      const participantData: any = {
        id: participantId,
        cohortId,
        name,
        phoneNumber,
        isAdmin: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Add optional fields only if they have values
      const gender = mapGender(row['성별']);
      if (gender) {
        participantData.gender = gender;
      }

      const occupation = row['회사/하는일']?.trim();
      if (occupation) {
        participantData.occupation = occupation;
      }

      if (uploadedImageUrl) {
        participantData.profileImageCircle = uploadedImageUrl;
        participantData.profileImage = uploadedImageUrl;
      }

      // Save to Firestore with custom ID
      await db.collection('participants').doc(participantId).set(participantData);

      console.log(`   ✅ Successfully imported!`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error:`, error);
      errorCount++;
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📊 Import Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Successfully imported: ${successCount}`);
  console.log(`⏭️  Skipped (already exists): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${validRecords.length}`);
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('🎉 Import completed!\n');
}

// Run the import
importParticipants()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
