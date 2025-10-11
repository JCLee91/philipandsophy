/**
 * Update All Profile Images Script
 *
 * Purpose:
 * 1. Add 김민준, 이윤지 participants
 * 2. Clear all existing Firebase Storage images
 * 3. Upload all profile images (members_10 + profil-circle)
 * 4. Update all participant records with image URLs
 *
 * Usage:
 *   tsx src/scripts/update-all-profile-images.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

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
const bucket = storage.bucket();

// New participants to add
// ⚠️ TODO: Update with actual phone numbers
const NEW_PARTICIPANTS = [
  {
    name: '김민준',
    phoneNumber: '01099995678', // Temporary placeholder - update with actual phone
    gender: 'male' as const,
    occupation: 'IT 기업 프로젝트 매니저',
  },
  {
    name: '이윤지',
    phoneNumber: '01099994321', // Temporary placeholder - update with actual phone
    gender: 'female' as const,
    occupation: 'F&B 기업 상품기획',
  },
];

// Profile image mapping (filename → participant ID)
const PROFILE_IMAGE_MAPPING: Record<string, string> = {
  // members_10 folder (full profile images)
  '1_박지영.png': '박지영-0780',
  '2_최종호.png': '최종호-1801',
  '3_서민석.png': '서민석-8409',
  '4_서현명.png': '서현명-4074',
  '5_김산하.png': '김산하-0998',
  '6_하진영.png': '하진영-5953',
  '7_이인재.png': '이인재-1827',
  '8_이예림.png': '이예림-9982',
  '9_유하람.png': '유하람-5568',
  '10_손다진.png': '손다진-9759',
  '11_이지현.png': '이지현-3552',
  '12_김청랑.png': '김청랑-1694',
  '13_김정현.png': '김정현-9672',
  '14_김동현.png': '김동현-0660',
  '15_방유라.png': '방유라-4637',
  '17_조현우.png': '조현우-0856',
  '18_전승훈.png': '전승훈-6815',
  'Profile_1기_유진욱.png': '유진욱-3870',
  'Profile_1기_김민준 (2).png': '김민준-5678', // New participant
  'Profile_1기_이윤지 (1).png': '이윤지-4321', // New participant
};

// Circle profile image mapping
// Note: Most circle images will be auto-matched by name
// Only add exceptions here if needed
const CIRCLE_IMAGE_MAPPING: Record<string, string> = {
  '김민준 (1).png': '김민준-5678', // New participant with (1) suffix
  '이윤지.png': '이윤지-4321', // New participant
};

async function clearFirebaseStorage() {
  console.log('\n🗑️  Clearing Firebase Storage...\n');

  const [files] = await bucket.getFiles({ prefix: 'profile_images/' });

  if (files.length === 0) {
    console.log('   ℹ️  No existing files to delete\n');
    return;
  }

  console.log(`   Found ${files.length} files to delete`);

  let deleted = 0;
  for (const file of files) {
    await file.delete();
    deleted++;
    if (deleted % 10 === 0) {
      console.log(`   🔄 Deleted ${deleted}/${files.length} files...`);
    }
  }

  console.log(`   ✅ Deleted ${deleted} files\n`);
}

async function uploadImageToStorage(
  localPath: string,
  storagePath: string
): Promise<string> {
  const fileBuffer = fs.readFileSync(localPath);
  const file = bucket.file(storagePath);

  await file.save(fileBuffer, {
    metadata: {
      contentType: 'image/png',
    },
  });

  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return publicUrl;
}

async function uploadAllImages() {
  console.log('📤 Uploading profile images...\n');

  const imageUrls: Record<
    string,
    { profileImage?: string; profileImageCircle?: string }
  > = {};

  // Cache participants for circle image matching
  const allParticipants = await db.collection('participants').get();
  const participantsCache = allParticipants.docs;

  // Upload members_10 images (full profile)
  console.log('   📸 Uploading full profile images (members_10)...');
  const membersDir = '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10';
  const memberFiles = fs.readdirSync(membersDir).filter((f) => f.endsWith('.png'));

  for (const filename of memberFiles) {
    const participantId = PROFILE_IMAGE_MAPPING[filename];
    if (!participantId) {
      console.log(`   ⚠️  No mapping for ${filename}, skipping`);
      continue;
    }

    const localPath = path.join(membersDir, filename);
    const storagePath = `profile_images/${participantId}_full.png`;

    try {
      const url = await uploadImageToStorage(localPath, storagePath);
      if (!imageUrls[participantId]) imageUrls[participantId] = {};
      imageUrls[participantId].profileImage = url;
      console.log(`   ✅ ${filename} → ${participantId}`);
    } catch (error) {
      console.error(`   ❌ Failed to upload ${filename}:`, error);
    }
  }

  // Upload profil-circle images (circle profile)
  console.log('\n   🔵 Uploading circle profile images (profil-circle)...');
  const circleDir = '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle';
  const circleFiles = fs.readdirSync(circleDir).filter((f) => f.endsWith('.png'));

  for (const filename of circleFiles) {
    let participantId = CIRCLE_IMAGE_MAPPING[filename];

    // If direct mapping fails, try extracting name from filename and matching by name
    if (!participantId) {
      // Extract name: remove .png and any (1) suffix
      // Normalize filename (macOS uses NFD, we need NFC)
      const normalizedFilename = filename.normalize('NFC');
      const nameWithoutExt = normalizedFilename.replace(/\.png$/, '').replace(/\s*\(\d+\)/, '');

      const matchingDoc = participantsCache.find(
        (doc) => {
          const dbName = doc.data().name.normalize('NFC');
          return dbName === nameWithoutExt;
        }
      );

      if (matchingDoc) {
        participantId = matchingDoc.id;
        console.log(`   🔍 Auto-matched "${normalizedFilename}" → ${nameWithoutExt} (${participantId})`);
      } else {
        console.log(`   ⚠️  No participant found for "${nameWithoutExt}" (${normalizedFilename})`);
        continue;
      }
    }

    const localPath = path.join(circleDir, filename);
    const storagePath = `profile_images/${participantId}_circle.png`;

    try {
      const url = await uploadImageToStorage(localPath, storagePath);
      if (!imageUrls[participantId]) imageUrls[participantId] = {};
      imageUrls[participantId].profileImageCircle = url;
      console.log(`   ✅ ${filename} → ${participantId}`);
    } catch (error) {
      console.error(`   ❌ Failed to upload ${filename}:`, error);
    }
  }

  console.log(`\n   ✅ Uploaded images for ${Object.keys(imageUrls).length} participants\n`);
  return imageUrls;
}

async function addNewParticipants(cohortId: string) {
  console.log('👥 Adding new participants...\n');

  for (const newParticipant of NEW_PARTICIPANTS) {
    const participantId = `${newParticipant.name}-${newParticipant.phoneNumber.slice(-4)}`;

    // Check if already exists
    const existingDoc = await db.collection('participants').doc(participantId).get();
    if (existingDoc.exists) {
      console.log(`   ⏭️  ${newParticipant.name} already exists, skipping`);
      continue;
    }

    const participantData = {
      id: participantId,
      cohortId,
      name: newParticipant.name,
      phoneNumber: newParticipant.phoneNumber,
      gender: newParticipant.gender,
      occupation: newParticipant.occupation,
      isAdmin: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await db.collection('participants').doc(participantId).set(participantData);
    console.log(`   ✅ Added ${newParticipant.name} (${participantId})`);
  }

  console.log('');
}

async function updateParticipantImages(
  imageUrls: Record<string, { profileImage?: string; profileImageCircle?: string }>
) {
  console.log('🔄 Updating participant records with image URLs...\n');

  let updated = 0;
  let skipped = 0;

  for (const [participantId, urls] of Object.entries(imageUrls)) {
    const docRef = db.collection('participants').doc(participantId);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`   ⚠️  Participant ${participantId} not found, skipping`);
      skipped++;
      continue;
    }

    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (urls.profileImage) {
      updateData.profileImage = urls.profileImage;
    }

    if (urls.profileImageCircle) {
      updateData.profileImageCircle = urls.profileImageCircle;
    }

    await docRef.update(updateData);
    console.log(`   ✅ Updated ${participantId}`);
    updated++;
  }

  console.log(`\n   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}\n`);
}

async function run() {
  console.log('🚀 Update All Profile Images Script');
  console.log('═══════════════════════════════════════════════════════\n');

  // Get active cohort
  const cohortsSnapshot = await db
    .collection('cohorts')
    .where('isActive', '==', true)
    .limit(1)
    .get();

  if (cohortsSnapshot.empty) {
    console.error('❌ No active cohort found!');
    process.exit(1);
  }

  const cohortId = cohortsSnapshot.docs[0].id;
  const cohortName = cohortsSnapshot.docs[0].data().name;
  console.log(`🎯 Target Cohort: ${cohortName} (${cohortId})\n`);

  try {
    // Step 1: Add new participants
    await addNewParticipants(cohortId);

    // Step 2: Clear existing storage
    await clearFirebaseStorage();

    // Step 3: Upload all images
    const imageUrls = await uploadAllImages();

    // Step 4: Update participant records
    await updateParticipantImages(imageUrls);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All profile images updated successfully!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
