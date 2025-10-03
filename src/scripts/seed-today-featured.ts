import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { format } from 'date-fns';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = require('../../firebase-service-account.json');

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function seedTodayFeatured() {
  console.log('🌱 오늘의 추천 참가자 설정 중...\n');

  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    console.log(`📅 날짜: ${today}`);

    // 오늘의 추천 4명 (다은이 볼 수 있는 프로필 북)
    // 2(다진), 3(구종), 4(현명), 5(정우진)
    const featuredIds = ['2', '3', '4', '5'];

    const cohortRef = db.collection('cohorts').doc('1');
    
    await cohortRef.update({
      [`dailyFeaturedParticipants.${today}`]: featuredIds,
    });

    console.log(`\n✅ 기수 1의 ${today} 추천 참가자 설정 완료:`);
    featuredIds.forEach((id, index) => {
      const names = ['다진', '구종', '현명', '정우진'];
      console.log(`   ${index + 1}. 참가자 ID: ${id} (${names[index]})`);
    });

    console.log('\n🎉 설정 완료!');
    console.log('\n📝 테스트 방법:');
    console.log('1. 다은(ID: 1) 계정으로 로그인');
    console.log('2. 오늘 독서 인증 완료');
    console.log('3. 채팅 페이지 하단의 "오늘의 서재" 버튼 클릭');
    console.log('4. 4명의 프로필 카드 확인\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// Run the script
seedTodayFeatured()
  .then(() => {
    console.log('✨ 스크립트 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('실패:', error);
    process.exit(1);
  });

