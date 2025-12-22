/**
 * 3기 참가자 성별 데이터 추가 스크립트
 *
 * 실행: npx tsx scripts/add-gender-data.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore(admin.app());

// 성별 매핑 (실제 데이터 기준)
const genderMap: Record<string, 'male' | 'female'> = {
  // 남성 (14명)
  '이민우': 'male',
  '최종호': 'male',
  '유하람': 'male',
  '박승윤': 'male',
  '최정웅': 'male',
  '조형래': 'male',
  '장상희': 'male',
  '이영진': 'male',
  '배태민': 'male',
  '홍석기': 'male',
  '한재윤': 'male',
  '박규민': 'male',
  '정재환': 'male',
  '한찬희': 'male',

  // 여성 (16명)
  '임은혜': 'female',
  '이지현': 'female',
  '이영빈': 'female',
  '강예진': 'female',
  '이시은': 'female',
  '김혜미': 'female',
  '문혜선': 'female',
  '김계륜': 'female',
  '전경영': 'female',
  '안소현': 'female',
  '안세현': 'female',
  '김하연': 'female',
  '김가영': 'female',
  '한상완': 'female',
  '서유지': 'female',
  '안세린': 'female',
};

async function addGenderData(dryRun = true) {
  console.log(`\n📊 3기 참가자 성별 데이터 추가 ${dryRun ? '(DRY RUN)' : '(실제 적용)'}\n`);

  const participants = await db
    .collection('participants')
    .where('cohortId', '==', '3')
    .get();

  console.log(`총 ${participants.size}명 참가자 확인\n`);

  let updatedCount = 0;
  let unknownCount = 0;
  const unknownNames: string[] = [];

  for (const doc of participants.docs) {
    const data = doc.data();
    const name = data.name;
    const currentGender = data.gender;

    if (currentGender) {
      console.log(`✓ ${name}: 이미 성별 있음 (${currentGender})`);
      continue;
    }

    const gender = genderMap[name];

    if (gender) {
      console.log(`${dryRun ? '[DRY]' : '✅'} ${name}: ${gender} 추가`);

      if (!dryRun) {
        await db.collection('participants').doc(doc.id).update({
          gender,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }

      updatedCount++;
    } else {
      console.log(`⚠️  ${name}: 성별 매핑 없음 (수동 추가 필요)`);
      unknownNames.push(name);
      unknownCount++;
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`\n📊 요약:`);
  console.log(`   업데이트: ${updatedCount}명`);
  console.log(`   매핑 없음: ${unknownCount}명`);
  console.log(`   남성: ${Object.values(genderMap).filter(g => g === 'male').length}명`);
  console.log(`   여성: ${Object.values(genderMap).filter(g => g === 'female').length}명`);

  if (unknownNames.length > 0) {
    console.log(`\n⚠️  수동 추가 필요한 이름:`);
    unknownNames.forEach(name => console.log(`   - ${name}`));
  }

  if (dryRun) {
    console.log(`\n💡 실제 적용하려면: npx tsx scripts/add-gender-data.ts --apply\n`);
  } else {
    console.log(`\n✅ 성별 데이터 추가 완료!\n`);
  }
}

async function main() {
  try {
    const dryRun = !process.argv.includes('--apply');
    await addGenderData(dryRun);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
