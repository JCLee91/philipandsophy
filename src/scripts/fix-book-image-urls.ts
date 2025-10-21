/**
 * 임시 제출 8명의 bookImageUrl 수정
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const db = getAdminDb();

async function fixBookImageUrls() {
  console.log('\n📸 임시 제출 15명의 bookImageUrl 수정...\n');

  const yesterdayDate = '2025-10-20';
  const validImageUrl = 'https://firebasestorage.googleapis.com/v0/b/philipandsophy.firebasestorage.app/o/reading_submissions%2F1%2Fbooks.jpeg?alt=media&token=55ae881c-9c5e-4995-b902-0243b5e2f74f';

  // 실제 인증한 5명 ID
  const realSubmitters = new Set([
    '이지현-3552',
    '전승훈-6815',
    '방유라-4637',
    '김정현-9672',
    '이인재-1827',
  ]);

  const snapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', yesterdayDate)
    .get();

  console.log(`📊 어제(${yesterdayDate}) 총 제출 데이터: ${snapshot.size}개\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const participantId = data.participantId;

    // 실제 인증한 5명은 건드리지 않음
    if (realSubmitters.has(participantId)) {
      console.log(`⏭️  ${participantId}: 실제 인증 (건너뜀)`);
      skippedCount++;
      continue;
    }

    // 나머지 15명은 모두 같은 이미지로 변경
    await doc.ref.update({
      bookImageUrl: validImageUrl,
    });

    console.log(`✅ ${participantId}: URL 수정 완료`);
    updatedCount++;
  }

  console.log(`\n📊 업데이트 완료`);
  console.log(`   - 건너뜀 (실제 인증): ${skippedCount}명`);
  console.log(`   - 수정 (임시 제출): ${updatedCount}명`);
  console.log(`\n✅ 작업 완료!\n`);
}

fixBookImageUrls()
  .then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
