/**
 * 현재 참가자들의 성별 데이터 상태 확인
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = require('../../firebase-service-account.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function checkGenderStatus() {
  console.log('📊 참가자 성별 데이터 상태 확인\n');

  const participantsSnapshot = await db.collection('participants').get();

  const stats = {
    total: participantsSnapshot.size,
    withGender: 0,
    male: 0,
    female: 0,
    other: 0,
    withoutGender: 0,
    adminCount: 0,
    regularCount: 0,
  };

  const byGender: { male: string[]; female: string[]; other: string[]; undefined: string[] } = {
    male: [],
    female: [],
    other: [],
    undefined: [],
  };

  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const name = data.name || 'Unknown';
    const gender = data.gender;
    const isAdmin = data.isAdmin || false;

    if (isAdmin) {
      stats.adminCount++;
    } else {
      stats.regularCount++;
    }

    if (gender) {
      stats.withGender++;
      if (gender === 'male') {
        stats.male++;
        byGender.male.push(name);
      } else if (gender === 'female') {
        stats.female++;
        byGender.female.push(name);
      } else {
        stats.other++;
        byGender.other.push(name);
      }
    } else {
      stats.withoutGender++;
      byGender.undefined.push(`${name}${isAdmin ? ' (관리자)' : ''}`);
    }
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 전체 통계:');
  console.log(`   총 참가자: ${stats.total}명`);
  console.log(`   관리자: ${stats.adminCount}명`);
  console.log(`   일반 사용자: ${stats.regularCount}명`);
  console.log('');
  console.log('   성별 정보 있음: ${stats.withGender}명');
  console.log(`   성별 정보 없음: ${stats.withoutGender}명`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('👥 성별 분포:');
  console.log(`   남성: ${stats.male}명`);
  byGender.male.forEach((name) => console.log(`      - ${name}`));
  console.log('');
  console.log(`   여성: ${stats.female}명`);
  byGender.female.forEach((name) => console.log(`      - ${name}`));

  if (stats.other > 0) {
    console.log('');
    console.log(`   기타: ${stats.other}명`);
    byGender.other.forEach((name) => console.log(`      - ${name}`));
  }

  if (stats.withoutGender > 0) {
    console.log('');
    console.log(`   ⚠️  성별 정보 없음: ${stats.withoutGender}명`);
    byGender.undefined.forEach((name) => console.log(`      - ${name}`));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 매칭 가능 여부 체크:');
  
  const MIN_PER_GENDER = 3;
  const canMatch = stats.male >= MIN_PER_GENDER && stats.female >= MIN_PER_GENDER && stats.withoutGender === 0;

  if (canMatch) {
    console.log(`   ✅ 매칭 가능 (각 성별 ${MIN_PER_GENDER}명 이상, 성별 정보 완전)`);
  } else {
    console.log(`   ❌ 매칭 불가능:`);
    if (stats.male < MIN_PER_GENDER) {
      console.log(`      - 남성 부족: ${stats.male}명 (필요: ${MIN_PER_GENDER}명)`);
    }
    if (stats.female < MIN_PER_GENDER) {
      console.log(`      - 여성 부족: ${stats.female}명 (필요: ${MIN_PER_GENDER}명)`);
    }
    if (stats.withoutGender > 0) {
      console.log(`      - 성별 정보 없음: ${stats.withoutGender}명`);
    }
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkGenderStatus()
  .then(() => {
    console.log('✅ 검사 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 검사 실패:', error);
    process.exit(1);
  });
