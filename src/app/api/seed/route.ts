import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, setDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { COLLECTIONS } from '@/types/database';

// Firebase 초기화
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

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
  { id: '1', cohortId: '1', name: '다은', phoneNumber: '01012345678', profileImage: '/profile/Profile_다은.png', profileBookUrl: 'https://example.com/profile-book/daeun' },
  { id: '2', cohortId: '1', name: '다진', phoneNumber: '01023456789', profileImage: '/profile/Profile_다진.png', profileBookUrl: 'https://example.com/profile-book/dajin' },
  { id: '3', cohortId: '1', name: '구종', phoneNumber: '01034567890', profileImage: '/profile/Profile_구종.png', profileBookUrl: 'https://example.com/profile-book/gujong' },
  { id: '4', cohortId: '1', name: '현명', phoneNumber: '01045678901', profileImage: '/profile/Profile_현명.png', profileBookUrl: 'https://example.com/profile-book/hyunmyung' },
  { id: '5', cohortId: '1', name: '정우진', phoneNumber: '01056789012', profileBookUrl: 'https://example.com/profile-book/woojin' },
  { id: '6', cohortId: '1', name: '강민아', phoneNumber: '01067890123', profileBookUrl: 'https://example.com/profile-book/mina' },
  { id: '7', cohortId: '1', name: '윤서준', phoneNumber: '01078901234', profileBookUrl: 'https://example.com/profile-book/seojun' },
  { id: '8', cohortId: '1', name: '임하늘', phoneNumber: '01089012345', profileBookUrl: 'https://example.com/profile-book/haneul' },
  { id: '9', cohortId: '1', name: '오지우', phoneNumber: '01090123456', profileBookUrl: 'https://example.com/profile-book/jiwoo' },
  { id: '10', cohortId: '1', name: '한예린', phoneNumber: '01001234567', profileBookUrl: 'https://example.com/profile-book/yerin' },
  { id: '11', cohortId: '1', name: '신태양', phoneNumber: '01011111111', profileBookUrl: 'https://example.com/profile-book/taeyang' },
  { id: '12', cohortId: '1', name: '조은별', phoneNumber: '01022222222', profileBookUrl: 'https://example.com/profile-book/eunbyul' },
  { id: '13', cohortId: '1', name: '권도윤', phoneNumber: '01033333333', profileBookUrl: 'https://example.com/profile-book/doyoon' },
  { id: '14', cohortId: '1', name: '남가을', phoneNumber: '01044444444', profileBookUrl: 'https://example.com/profile-book/gaeul' },
  { id: '15', cohortId: '1', name: '배겨울', phoneNumber: '01055555555', profileBookUrl: 'https://example.com/profile-book/gyeoul' },
  { id: '16', cohortId: '1', name: '서봄', phoneNumber: '01066666666', profileBookUrl: 'https://example.com/profile-book/bom' },
  { id: '17', cohortId: '1', name: '안여름', phoneNumber: '01077777777', profileBookUrl: 'https://example.com/profile-book/yeoreum' },
  { id: '18', cohortId: '1', name: '장하람', phoneNumber: '01088888888', profileBookUrl: 'https://example.com/profile-book/haram' },
  { id: '19', cohortId: '1', name: '전소율', phoneNumber: '01099999999', profileBookUrl: 'https://example.com/profile-book/soyul' },
  { id: '20', cohortId: '1', name: '홍채원', phoneNumber: '01000000000', profileBookUrl: 'https://example.com/profile-book/chaewon' },
];

const noticesData = [
  {
    cohortId: '1',
    author: '필립앤소피',
    content: '안녕하세요! 1주차 독서 인증을 시작합니다. 하단의 "독서 인증하기" 버튼을 눌러 인증 폼을 작성해주세요. 인증 마감은 오늘 자정까지입니다.',
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

export async function POST(request: NextRequest) {
  try {
    const results = {
      cohorts: [] as string[],
      participants: [] as string[],
      notices: [] as string[],
      errors: [] as string[],
    };

    // Seed cohorts
    for (const cohort of cohortsData) {
      try {
        const { id, ...cohortData } = cohort;
        const cohortRef = doc(db, COLLECTIONS.COHORTS, id);
        await setDoc(cohortRef, {
          ...cohortData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        results.cohorts.push(`✅ ${cohort.name}`);
      } catch (error: any) {
        results.errors.push(`❌ Cohort ${cohort.name}: ${error.message}`);
      }
    }

    // Seed participants
    for (const participant of participantsData) {
      try {
        const { id, ...participantData } = participant;
        const participantRef = doc(db, COLLECTIONS.PARTICIPANTS, id);
        await setDoc(participantRef, {
          ...participantData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        results.participants.push(`✅ ${participant.name}`);
      } catch (error: any) {
        results.errors.push(`❌ Participant ${participant.name}: ${error.message}`);
      }
    }

    // Seed notices
    for (const notice of noticesData) {
      try {
        await addDoc(collection(db, COLLECTIONS.NOTICES), {
          ...notice,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        results.notices.push(`✅ ${notice.content.substring(0, 30)}...`);
      } catch (error: any) {
        results.errors.push(`❌ Notice: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Seeding completed',
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
