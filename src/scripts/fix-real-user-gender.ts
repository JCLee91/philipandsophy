/**
 * 실제 사용자 2명의 성별 정보 수정
 * - user-junyoung (문준영): 남성
 * - user-hyunji (김현지): 여성
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
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

async function updateRealUserGenders() {
  console.log('👥 실제 사용자 성별 정보 업데이트 시작...\n');

  const updates = [
    { name: '문준영', gender: 'male' as const },
    { name: '김현지', gender: 'female' as const },
  ];

  let successCount = 0;

  for (const { name, gender } of updates) {
    const participantsSnapshot = await db
      .collection('participants')
      .where('name', '==', name)
      .get();

    if (participantsSnapshot.empty) {
      console.warn(`⚠️  ${name} 참가자를 찾을 수 없음`);
      continue;
    }

    const batch = db.batch();
    participantsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        gender,
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();
    
    const genderLabel = gender === 'male' ? '남성' : '여성';
    console.log(`✅ ${name}: ${genderLabel} (${participantsSnapshot.size}개 문서 업데이트)`);
    successCount += participantsSnapshot.size;
  }

  console.log(`\n🎉 총 ${successCount}개 문서 업데이트 완료!\n`);
}

updateRealUserGenders()
  .then(() => {
    console.log('✅ 프로세스 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 프로세스 실패:', error);
    process.exit(1);
  });
