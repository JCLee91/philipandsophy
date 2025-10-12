import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getTodayString } from '../lib/date-utils';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = require('../../firebase-service-account.json');

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function deleteMatching() {
  const cohortId = '1';

  // 명령줄 인수로 날짜 지정 가능 (예: npm run delete:matching 2025-10-11)
  const matchingDate = process.argv[2] || getTodayString(); // 오늘 날짜 (YYYY-MM-DD)

  console.log(`🗑️  Cohort ${cohortId}의 ${matchingDate} 매칭 결과 삭제 중...`);

  const cohortRef = db.collection('cohorts').doc(cohortId);
  const cohortDoc = await cohortRef.get();

  if (!cohortDoc.exists) {
    console.error('❌ Cohort를 찾을 수 없습니다.');
    process.exit(1);
  }

  const cohortData = cohortDoc.data();
  const dailyFeaturedParticipants = cohortData?.dailyFeaturedParticipants || {};

  // 현재 저장된 모든 날짜 키 출력
  console.log('\n📅 현재 저장된 매칭 날짜 키 목록:');
  const keys = Object.keys(dailyFeaturedParticipants);
  if (keys.length === 0) {
    console.log('   (없음)');
  } else {
    keys.forEach(key => console.log(`   - ${key}`));
  }
  console.log();

  if (!dailyFeaturedParticipants[matchingDate]) {
    console.log(`✅ ${matchingDate} 매칭 결과가 존재하지 않습니다.`);
    console.log(`   (위 목록에서 ${matchingDate}을 찾을 수 없습니다.)`);
    process.exit(0);
  }

  // 해당 날짜 키 삭제
  delete dailyFeaturedParticipants[matchingDate];

  await cohortRef.update({
    dailyFeaturedParticipants,
    updatedAt: Timestamp.now(),
  });

  console.log(`✅ ${matchingDate} 매칭 결과가 성공적으로 삭제되었습니다.`);
  console.log('   이제 관리자 페이지에서 매칭을 다시 실행할 수 있습니다.');
}

deleteMatching().then(() => process.exit(0));
