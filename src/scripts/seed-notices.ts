import { initializeFirebase, createNotice } from '@/lib/firebase';

/**
 * Initial notices seed data
 * This script populates the Firestore database with initial notices
 */

const INITIAL_NOTICES = [
  {
    cohortId: '1',
    author: '필립앤소피',
    content:
      '안녕하세요! 1주차 독서 인증을 시작합니다. 하단의 "독서 인증하기" 버튼을 눌러 인증 폼을 작성해주세요. 인증 마감은 오늘 자정까지입니다.',
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
    content:
      '필립앤소피 독서모임에 오신 것을 환영합니다!\n\n앞으로 2주간 함께 책을 읽고 성장해나가요. 궁금한 점이 있으시면 언제든 문의해주세요.',
    isPinned: false,
  },
];

async function seedNotices() {
  console.log('🌱 Starting to seed notices...');

  // Initialize Firebase
  initializeFirebase();

  try {
    for (const notice of INITIAL_NOTICES) {
      const noticeId = await createNotice(notice);
      console.log(`✅ Created notice: ${noticeId}`);
    }

    console.log('🎉 Successfully seeded all notices!');
  } catch (error) {
    console.error('❌ Error seeding notices:', error);
    throw error;
  }
}

// Run the seed function
seedNotices().catch(console.error);
