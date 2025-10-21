/**
 * 어제 실제로 제출한 사람들 확인 (오후 12시가 아닌 제출 시간)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const db = getAdminDb();

async function checkRealSubmissions() {
  console.log('\n📚 어제 실제 제출자 확인 (제출 시간 기준)...\n');

  const yesterdayDate = '2025-10-20';

  const snapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', yesterdayDate)
    .get();

  console.log(`📊 어제(${yesterdayDate}) 총 제출 데이터: ${snapshot.size}개\n`);

  const realSubmissions: any[] = [];
  const tempSubmissions: any[] = [];

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const submittedAt = data.submittedAt?.toDate();

    if (submittedAt) {
      const kstTime = toZonedTime(submittedAt, 'Asia/Seoul');
      const timeString = format(kstTime, 'HH:mm:ss');
      const hour = kstTime.getHours();

      const info = {
        participantId: data.participantId,
        time: timeString,
        bookTitle: data.bookTitle,
        dailyQuestion: data.dailyQuestion?.substring(0, 50) + '...',
      };

      // 12시가 아니면 실제 제출
      if (hour !== 12) {
        realSubmissions.push(info);
      } else {
        tempSubmissions.push(info);
      }
    }
  });

  console.log(`✅ 실제 제출 (오후 12시 아님): ${realSubmissions.length}명\n`);
  realSubmissions.forEach((info, idx) => {
    console.log(`${idx + 1}. ${info.participantId} - ${info.time}`);
    console.log(`   책: "${info.bookTitle}"`);
    console.log(`   질문: "${info.dailyQuestion}"`);
  });

  console.log(`\n⚠️  임시 제출 (12시대): ${tempSubmissions.length}명\n`);
  tempSubmissions.forEach((info, idx) => {
    console.log(`${idx + 1}. ${info.participantId} - ${info.time}`);
  });

  console.log(`\n✅ 확인 완료\n`);
}

checkRealSubmissions()
  .then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
