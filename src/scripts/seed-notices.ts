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

/**
 * Initial notices seed data
 * This script populates the Firestore database with initial notices
 */

const INITIAL_NOTICES = [
  {
    cohortId: '1',
    author: '필립앤소피',
    content:
      '📚 1주차 독서 인증 안내\n\n안녕하세요, 필립앤소피입니다!\n이번 주 독서 인증을 시작합니다.\n\n✅ 인증 방법\n1. 하단 "독서 인증하기" 버튼 클릭\n2. 책 표지 사진 업로드\n3. 간단한 리뷰와 오늘의 질문 답변 작성\n\n⏰ 마감: 오늘 자정 (23:59)\n\n인증 후 "오늘의 서재"에서 다른 멤버들의 프로필 북을 확인해보세요!',
    imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
    isPinned: true,
  },
  {
    cohortId: '1',
    author: '필립앤소피',
    content:
      '🎯 이번 주 온라인 모임 안내\n\n일시: 이번 주 토요일 오후 8시\n링크: https://zoom.us/j/1234567890\n\n📖 토론 주제\n- 이번 주 읽은 책의 핵심 메시지\n- 일상에서 실천할 수 있는 인사이트\n\n많은 참여 부탁드립니다! 😊',
    isPinned: false,
  },
  {
    cohortId: '1',
    author: '필립앤소피',
    content:
      '🌟 필립앤소피 1기를 환영합니다!\n\n함께 책을 읽고, 생각을 나누며 성장하는 2주간의 여정을 시작합니다.\n\n💡 활동 가이드\n• 매일 독서 인증으로 꾸준한 습관 만들기\n• "오늘의 서재"에서 취향이 맞는 멤버 발견하기\n• 온라인 모임에서 깊이 있는 대화 나누기\n\n질문이나 어려운 점이 있으시면 언제든 운영자에게 메시지 주세요.\n\n함께 성장하는 독서 여정, 기대됩니다! 📖✨',
    isPinned: false,
  },
  {
    cohortId: '1',
    author: '필립앤소피',
    content:
      '☕️ 독서 카페 모임 추가 공지\n\n온라인 모임 외에 오프라인 독서 카페 모임을 추가로 진행합니다!\n\n📍 장소: 성수동 "책과 커피" 카페\n📅 일시: 다음 주 일요일 오후 3시\n\n편안한 분위기에서 책 이야기 나누며 커피 한 잔 어떠세요?\n참석 여부는 댓글로 알려주세요! 🙌',
    imageUrl: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800',
    isPinned: false,
  },
];

async function seedNotices() {
  console.log('🌱 Starting to seed notices...');

  try {
    for (const notice of INITIAL_NOTICES) {
      const noticeRef = db.collection('notices').doc();

      const dataToSave = {
        ...notice,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await noticeRef.set(dataToSave);
      console.log(`✅ Created notice: ${noticeRef.id}`);
    }

    console.log(`\n🎉 Successfully seeded ${INITIAL_NOTICES.length} notices!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding notices:', error);
    process.exit(1);
  }
}

// Run the seed function
seedNotices();
