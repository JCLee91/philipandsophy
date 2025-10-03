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

async function seedTodayVerification() {
  console.log('🌱 오늘의 독서 인증 추가 중...\n');

  try {
    const now = new Date();
    const submissionDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // 다은(ID: 1)의 오늘 독서 인증
    const submission = {
      participantId: '1',
      participationCode: '1',
      bookImageUrl: 'https://picsum.photos/seed/book-today-1/800/600',
      review: '오늘도 책과 함께 성장하는 하루였습니다. 새로운 인사이트를 얻었어요!',
      dailyQuestion: '당신에게 독서란 무엇인가요?',
      dailyAnswer: '나를 발견하고 세상을 이해하는 창문입니다.\n매일 조금씩 성장하는 제 자신을 느낄 수 있어요.',
      submittedAt: Timestamp.fromDate(now),
      submissionDate,
      status: 'approved',
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    const docRef = db.collection('reading_submissions').doc();
    await docRef.set(submission);

    console.log(`✅ 독서 인증 추가 완료`);
    console.log(`   - 참가자: 다은 (ID: 1)`);
    console.log(`   - 날짜: ${submissionDate}`);
    console.log(`   - 상태: 승인됨`);

    console.log('\n🎉 설정 완료!');
    console.log('\n📝 이제 다음 경로로 접속하세요:');
    console.log('   http://localhost:3000/chat?cohort=1&userId=1\n');
    console.log('✨ 하단의 "오늘의 서재" 버튼을 클릭하면 4명의 프로필을 볼 수 있어요!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// Run the script
seedTodayVerification()
  .then(() => {
    console.log('✨ 스크립트 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('실패:', error);
    process.exit(1);
  });

