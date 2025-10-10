/**
 * Firebase Admin SDK Seed Script
 * Uses Admin SDK for reliable seeding from CLI
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Service Account 키 경로
const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

// 키 파일 확인
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service Account 키 파일을 찾을 수 없습니다.');
  console.error('📝 ADMIN_SDK_SETUP.md 파일을 참고하여 키를 다운로드하세요.');
  process.exit(1);
}

// Admin SDK 초기화
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// 시딩 데이터
const cohortsData = [
  {
    id: '1',
    name: '1기',
    accessCode: '1234',
    startDate: '2025-10-01',
    endDate: '2025-10-14',
    isActive: true,
  },
  {
    id: '2',
    name: '2기',
    accessCode: '5678',
    startDate: '2025-10-15',
    endDate: '2025-10-28',
    isActive: false,
  },
];

const participantsData = [
  { id: 'admin', cohortId: '1', name: '운영자', phoneNumber: '01000000001', profileImage: '/pns-logo.webp', isAdmin: true },
  { id: 'admin2', cohortId: '1', name: '문준영', phoneNumber: '42633467921', profileImage: '/pns-logo.webp', isAdmin: true },
  { id: 'admin3', cohortId: '1', name: '김현지', phoneNumber: '42627615193', profileImage: '/pns-logo.webp', isAdmin: true },
  { id: 'admin4', cohortId: '1', name: '관리자4', phoneNumber: '42624539284', profileImage: '/pns-logo.webp', isAdmin: true },
];

const noticesData: any[] = [];

// Helper: undefined 값 제거
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
}

async function seedCohorts() {
  console.log('🌱 Seeding cohorts...');

  for (const cohort of cohortsData) {
    const { id, ...cohortData } = cohort;
    const cleanData = removeUndefined(cohortData);

    await db.collection('cohorts').doc(id).set({
      ...cleanData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Cohort created: ${cohort.name} (${id})`);
  }

  console.log(`\n✨ Successfully seeded ${cohortsData.length} cohorts\n`);
}

async function seedParticipants() {
  console.log('🌱 Seeding participants...');

  for (const participant of participantsData) {
    const { id, ...participantData } = participant;
    const cleanData = removeUndefined(participantData);

    await db.collection('participants').doc(id).set({
      ...cleanData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Participant created: ${participant.name} (${id})`);
  }

  console.log(`\n✨ Successfully seeded ${participantsData.length} participants\n`);
}

async function seedNotices() {
  console.log('🌱 Seeding notices...');

  for (const notice of noticesData) {
    const cleanData = removeUndefined(notice);

    const docRef = await db.collection('notices').add({
      ...cleanData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Notice created: ${docRef.id}`);
  }

  console.log(`\n✨ Successfully seeded ${noticesData.length} notices\n`);
}

async function main() {
  try {
    console.log('🚀 Starting Admin SDK seed process...\n');

    await seedCohorts();
    await seedParticipants();
    await seedNotices();

    console.log('🎉 All data seeded successfully with Admin SDK!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

main();
