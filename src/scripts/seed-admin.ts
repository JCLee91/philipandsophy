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
  { id: '1', cohortId: '1', name: '다은', phoneNumber: '01012345678', profileImage: '/profile/Profile_다은.png' },
  { id: '2', cohortId: '1', name: '다진', phoneNumber: '01023456789', profileImage: '/profile/Profile_다진.png' },
  { id: '3', cohortId: '1', name: '구종', phoneNumber: '01034567890', profileImage: '/profile/Profile_구종.png' },
  { id: '4', cohortId: '1', name: '현명', phoneNumber: '01045678901', profileImage: '/profile/Profile_현명.png' },
  { id: '5', cohortId: '1', name: '정우진', phoneNumber: '01056789012' },
  { id: '6', cohortId: '1', name: '강민아', phoneNumber: '01067890123' },
  { id: '7', cohortId: '1', name: '윤서준', phoneNumber: '01078901234' },
  { id: '8', cohortId: '1', name: '임하늘', phoneNumber: '01089012345' },
  { id: '9', cohortId: '1', name: '오지우', phoneNumber: '01090123456' },
  { id: '10', cohortId: '1', name: '한예린', phoneNumber: '01001234567' },
  { id: '11', cohortId: '1', name: '신태양', phoneNumber: '01011111111' },
  { id: '12', cohortId: '1', name: '조은별', phoneNumber: '01022222222' },
  { id: '13', cohortId: '1', name: '권도윤', phoneNumber: '01033333333' },
  { id: '14', cohortId: '1', name: '남가을', phoneNumber: '01044444444' },
  { id: '15', cohortId: '1', name: '배겨울', phoneNumber: '01055555555' },
  { id: '16', cohortId: '1', name: '서봄', phoneNumber: '01066666666' },
  { id: '17', cohortId: '1', name: '안여름', phoneNumber: '01077777777' },
  { id: '18', cohortId: '1', name: '장하람', phoneNumber: '01088888888' },
  { id: '19', cohortId: '1', name: '전소율', phoneNumber: '01099999999' },
  { id: '20', cohortId: '1', name: '홍채원', phoneNumber: '01000000000' },
];

const noticesData = [
  {
    cohortId: '1',
    author: '필립앤소피',
    content: '안녕하세요! 1주차 독서 인증을 시작합니다. 하단의 "독서 인증하기" 버튼을 눌러 인증 폼을 작성해주세요. 인증 마감은 오늘 자정까지입니다.',
    // NOTE: Development seed data - placeholder image from picsum.photos
    imageUrl: 'https://picsum.photos/seed/book1/800/600',
    isPinned: false,
  },
  {
    cohortId: '1',
    author: '필립앤소피',
    content: '금주 온라인 줌 모임 링크입니다: https://zoom.us/j/1234567890',
    isPinned: false,
  },
  {
    cohortId: '1',
    author: '필립앤소피',
    content: '필립앤소피 독서모임에 오신 것을 환영합니다!\n\n앞으로 2주간 함께 책을 읽고 성장해나가요. 궁금한 점이 있으시면 언제든 문의해주세요.',
    isPinned: false,
  },
];

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
