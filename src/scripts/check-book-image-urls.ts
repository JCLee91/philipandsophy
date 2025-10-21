/**
 * 어제 임시 제출 15명의 bookImageUrl 확인
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const db = getAdminDb();

async function checkBookImageUrls() {
  console.log('\n📸 어제 임시 제출 15명의 bookImageUrl 확인...\n');

  const yesterdayDate = '2025-10-20';

  const snapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', yesterdayDate)
    .get();

  console.log(`📊 어제(${yesterdayDate}) 총 제출 데이터: ${snapshot.size}개\n`);

  // 12:00:00 임시 제출만 필터링
  const tempSubmissions: any[] = [];

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const submittedAt = data.submittedAt?.toDate();

    if (submittedAt) {
      const kstTime = toZonedTime(submittedAt, 'Asia/Seoul');
      const hour = kstTime.getHours();
      const minute = kstTime.getMinutes();
      const second = kstTime.getSeconds();

      if (hour === 12 && minute === 0 && second === 0) {
        tempSubmissions.push({
          participantId: data.participantId,
          bookImageUrl: data.bookImageUrl,
          bookCoverUrl: data.bookCoverUrl,
          bookTitle: data.bookTitle,
        });
      }
    }
  });

  console.log(`🔍 임시 제출 15명:\n`);

  let validCount = 0;
  let invalidCount = 0;
  let emptyCount = 0;

  tempSubmissions.forEach((sub, idx) => {
    const url = sub.bookImageUrl;
    let status = '';

    if (!url || url === 'undefined' || url.trim() === '') {
      status = '❌ 없음';
      emptyCount++;
    } else if (url.includes('placeholder') || url.includes('picsum')) {
      status = '⚠️  Placeholder';
      invalidCount++;
    } else if (url.startsWith('http')) {
      status = '✅ 정상';
      validCount++;
    } else {
      status = '❓ 알 수 없음';
      invalidCount++;
    }

    console.log(`${idx + 1}. ${sub.participantId}`);
    console.log(`   bookImageUrl: ${status}`);
    console.log(`   URL: ${url || '(없음)'}`);
    console.log(`   책: "${sub.bookTitle}"`);
    console.log('');
  });

  console.log(`📊 결과:`);
  console.log(`   - 정상: ${validCount}명`);
  console.log(`   - 문제 (Placeholder/없음): ${invalidCount + emptyCount}명`);
  console.log(`\n✅ 확인 완료\n`);
}

checkBookImageUrls()
  .then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
