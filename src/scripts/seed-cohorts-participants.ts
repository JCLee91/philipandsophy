/**
 * Seed Script: Cohorts & Participants
 * Migrates data from src/data to Firebase Firestore
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = require('../../firebase-service-account.json');

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// Helper to generate today's matching (seed용 빈 데이터)
function getTodayMatching() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return {
    [today]: {
      assignments: {
        // Seed 데이터이므로 빈 assignments
        // 실제 매칭은 AI를 통해 생성됩니다
      },
    },
  };
}

// Cohorts data (from src/data/cohorts.ts)
const cohortsData = [
  {
    id: '1',
    name: '1기',
    accessCode: '1234',
    startDate: '2025-10-01',
    endDate: '2025-10-14',
    isActive: true,
    dailyFeaturedParticipants: getTodayMatching(),
  },
  {
    id: '2',
    name: '2기',
    accessCode: '5678',
    startDate: '2025-10-15',
    endDate: '2025-10-28',
    isActive: false,
    dailyFeaturedParticipants: {},
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
    occupation: '마케터',
    bio: '새로운 경험과 배움을 통해 성장하는 것을 좋아합니다. 책과 함께하는 시간이 일상의 활력소예요.',
  },
  {
    id: '2',
    cohortId: '1',
    name: '다진',
    phoneNumber: '01023456789',
    profileImage: '/profile/Profile_다진.png',
    occupation: '디자이너',
    bio: '일상 속 작은 아름다움을 발견하고 기록하는 것을 즐깁니다.',
  },
  {
    id: '3',
    cohortId: '1',
    name: '구종',
    phoneNumber: '01034567890',
    profileImage: '/profile/Profile_구종.png',
    occupation: '중학교 교사',
    bio: '새로운 도전을 두려워하지 않고 삶의 결을 다채롭게 이어가는 사람',
  },
  {
    id: '4',
    cohortId: '1',
    name: '현명',
    phoneNumber: '01045678901',
    profileImage: '/profile/Profile_현명.png',
    occupation: '개발자',
    bio: '기술과 인문학의 경계에서 새로운 가치를 만들어가고 있습니다.',
  },
  {
    id: '5',
    cohortId: '1',
    name: '정우진',
    phoneNumber: '01056789012',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    occupation: '스타트업 대표',
    bio: '혁신과 도전을 좋아하며, 책을 통해 새로운 인사이트를 얻습니다.',
  },
  {
    id: '6',
    cohortId: '1',
    name: '강민아',
    phoneNumber: '01067890123',
    profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    occupation: 'UX 디자이너',
    bio: '사용자의 마음을 이해하고, 책에서 인간 심리를 배웁니다.',
  },
  {
    id: '7',
    cohortId: '1',
    name: '윤서준',
    phoneNumber: '01078901234',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    occupation: '변호사',
    bio: '법과 정의에 관심이 많으며, 인문학 서적을 즐겨 읽습니다.',
  },
  {
    id: '8',
    cohortId: '1',
    name: '임하늘',
    phoneNumber: '01089012345',
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    occupation: '프리랜서 작가',
    bio: '글쓰기를 사랑하고, 독서는 제 창작의 원천입니다.',
  },
  {
    id: '9',
    cohortId: '1',
    name: '오지우',
    phoneNumber: '01090123456',
    profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    occupation: '데이터 사이언티스트',
    bio: '숫자와 패턴 속에서 진실을 찾고, 책에서 영감을 얻습니다.',
  },
  {
    id: '10',
    cohortId: '1',
    name: '한예린',
    phoneNumber: '01001234567',
    profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    occupation: '피아니스트',
    bio: '음악과 문학, 두 예술의 조화 속에서 살아갑니다.',
  },
  {
    id: '11',
    cohortId: '1',
    name: '신태양',
    phoneNumber: '01011111111',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    occupation: '건축가',
    bio: '공간을 디자인하며, 책에서 새로운 관점을 배웁니다.',
  },
  {
    id: '12',
    cohortId: '1',
    name: '조은별',
    phoneNumber: '01022222222',
    profileImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
    occupation: '마케팅 매니저',
    bio: '트렌드를 읽고 사람들과 소통하는 것을 좋아합니다.',
  },
  {
    id: '13',
    cohortId: '1',
    name: '권도윤',
    phoneNumber: '01033333333',
    profileImage: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400',
    occupation: '의사',
    bio: '의학과 인문학의 만남에서 치유의 본질을 찾습니다.',
  },
  {
    id: '14',
    cohortId: '1',
    name: '남가을',
    phoneNumber: '01044444444',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    occupation: '요가 강사',
    bio: '몸과 마음의 균형, 독서로 내면의 평화를 찾아갑니다.',
  },
  {
    id: '15',
    cohortId: '1',
    name: '배겨울',
    phoneNumber: '01055555555',
    profileImage: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',
    occupation: '사진작가',
    bio: '순간을 포착하고, 책 속 이야기를 이미지로 상상합니다.',
  },
  {
    id: '16',
    cohortId: '1',
    name: '서봄',
    phoneNumber: '01066666666',
    profileImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    occupation: '초등학교 교사',
    bio: '아이들에게 책 읽는 즐거움을 알려주는 것이 행복합니다.',
  },
  {
    id: '17',
    cohortId: '1',
    name: '안여름',
    phoneNumber: '01077777777',
    profileImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    occupation: '환경운동가',
    bio: '지구와 자연을 사랑하며, 생태 관련 서적을 즐겨 읽습니다.',
  },
  {
    id: '18',
    cohortId: '1',
    name: '장하람',
    phoneNumber: '01088888888',
    profileImage: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400',
    occupation: '셰프',
    bio: '요리와 책, 두 가지 레시피로 삶을 풍요롭게 만듭니다.',
  },
  {
    id: '19',
    cohortId: '1',
    name: '전소율',
    phoneNumber: '01099999999',
    profileImage: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400',
    occupation: '심리상담사',
    bio: '사람의 마음을 이해하고, 책에서 공감의 힘을 배웁니다.',
  },
  {
    id: '20',
    cohortId: '1',
    name: '홍채원',
    phoneNumber: '01000000000',
    profileImage: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400',
    occupation: '브랜드 디렉터',
    bio: '브랜드 스토리를 만들며, 독서에서 영감을 얻습니다.',
  },
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
    const cohortRef = db.collection('cohorts').doc(id);

    // Remove undefined values first, then add timestamps
    const cleanData = removeUndefined(cohortData);
    const dataToSave = {
      ...cleanData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    console.log(`📝 Saving cohort ${id}: ${cohort.name}`);

    await cohortRef.set(dataToSave);
    console.log(`✅ Cohort created: ${cohort.name} (${id})`);
  }

  console.log(`\n✨ Successfully seeded ${cohortsData.length} cohorts\n`);
}

async function seedParticipants() {
  console.log('🌱 Seeding participants...');

  for (const participant of participantsData) {
    const { id, ...participantData } = participant;
    const participantRef = db.collection('participants').doc(id);

    // Remove undefined values first, then add timestamps
    const cleanData = removeUndefined(participantData);
    const dataToSave = {
      ...cleanData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    console.log(`📝 Saving participant ${id} (${participant.name})`);

    await participantRef.set(dataToSave);
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
