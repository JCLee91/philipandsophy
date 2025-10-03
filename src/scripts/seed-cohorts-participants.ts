/**
 * Seed Script: Cohorts & Participants
 * Migrates data from src/data to Firebase Firestore
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '../types/database';

// Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cohorts data (from src/data/cohorts.ts)
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

// Participants data (from src/data/participants.ts)
const participantsData = [
  // 운영자
  {
    id: 'admin',
    cohortId: '1',
    name: '운영자',
    phoneNumber: '01000000001',
    profileImage: '/pns-logo.webp',
    isAdmin: true,
  },
  // 1기 참가자들
  {
    id: '1',
    cohortId: '1',
    name: '다은',
    phoneNumber: '01012345678',
    profileImage: '/profile/Profile_다은.png',
    profileBookUrl: 'https://example.com/profile-book/1',
    occupation: '마케터',
    bio: '새로운 경험과 배움을 통해 성장하는 것을 좋아합니다. 책과 함께하는 시간이 일상의 활력소예요.',
  },
  {
    id: '2',
    cohortId: '1',
    name: '다진',
    phoneNumber: '01023456789',
    profileImage: '/profile/Profile_다진.png',
    profileBookUrl: 'https://example.com/profile-book/2',
    occupation: '디자이너',
    bio: '일상 속 작은 아름다움을 발견하고 기록하는 것을 즐깁니다.',
  },
  {
    id: '3',
    cohortId: '1',
    name: '구종',
    phoneNumber: '01034567890',
    profileImage: '/profile/Profile_구종.png',
    profileBookUrl: 'https://example.com/profile-book/3',
    occupation: '중학교 교사',
    bio: '새로운 도전을 두려워하지 않고 삶의 결을 다채롭게 이어가는 사람',
  },
  {
    id: '4',
    cohortId: '1',
    name: '현명',
    phoneNumber: '01045678901',
    profileImage: '/profile/Profile_현명.png',
    profileBookUrl: 'https://example.com/profile-book/4',
    occupation: '개발자',
    bio: '기술과 인문학의 경계에서 새로운 가치를 만들어가고 있습니다.',
  },
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

// Helper function to remove undefined values
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
}

async function seedCohorts() {
  console.log('🌱 Seeding cohorts...');

  for (const cohort of cohortsData) {
    const { id, ...cohortData } = cohort;
    const cohortRef = doc(db, COLLECTIONS.COHORTS, id);

    // Remove undefined values first, then add timestamps
    const cleanData = removeUndefined(cohortData);
    const dataToSave = {
      ...cleanData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    console.log(`📝 Saving cohort ${id}: ${cohort.name}`);

    await setDoc(cohortRef, dataToSave);
    console.log(`✅ Cohort created: ${cohort.name} (${id})`);
  }

  console.log(`\n✨ Successfully seeded ${cohortsData.length} cohorts\n`);
}

async function seedParticipants() {
  console.log('🌱 Seeding participants...');

  for (const participant of participantsData) {
    const { id, ...participantData } = participant;
    const participantRef = doc(db, COLLECTIONS.PARTICIPANTS, id);

    // Remove undefined values first, then add timestamps
    const cleanData = removeUndefined(participantData);
    const dataToSave = {
      ...cleanData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    console.log(`📝 Saving participant ${id} (${participant.name})`);

    await setDoc(participantRef, dataToSave);
    console.log(`✅ Participant created: ${participant.name} (${id})`);
  }

  console.log(`\n✨ Successfully seeded ${participantsData.length} participants\n`);
}

async function main() {
  try {
    console.log('🚀 Starting seed process...\n');

    await seedCohorts();
    await seedParticipants();

    console.log('🎉 All data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

main();
