/**
 * 임시 제출 15명의 책 표지, 저자, 설명 업데이트
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const db = getAdminDb();

async function updateTempSubmissions() {
  console.log('\n📚 임시 제출 15명의 책 정보 업데이트 시작...\n');

  const yesterdayDate = '2025-10-20';

  // 1. 어제 제출 데이터 조회
  const snapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', yesterdayDate)
    .get();

  console.log(`📊 어제(${yesterdayDate}) 총 제출 데이터: ${snapshot.size}개\n`);

  // 2. 12:00:00 임시 제출 필터링
  const tempSubmissions: any[] = [];

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const submittedAt = data.submittedAt?.toDate();

    if (submittedAt) {
      const kstTime = toZonedTime(submittedAt, 'Asia/Seoul');
      const hour = kstTime.getHours();
      const minute = kstTime.getMinutes();
      const second = kstTime.getSeconds();

      // 12시 정각인 경우 임시 제출
      if (hour === 12 && minute === 0 && second === 0) {
        tempSubmissions.push({
          docRef: doc.ref,
          participantId: data.participantId,
          currentTitle: data.bookTitle,
          currentAuthor: data.bookAuthor,
          currentCover: data.bookCoverUrl,
        });
      }
    }
  });

  console.log(`🔍 임시 제출 대상: ${tempSubmissions.length}명\n`);

  if (tempSubmissions.length === 0) {
    console.log('❌ 업데이트할 데이터가 없습니다.');
    return;
  }

  // 3. 각 참가자의 최근 제출 데이터로 업데이트
  let updatedCount = 0;
  let noDataCount = 0;

  for (const temp of tempSubmissions) {
    const participantId = temp.participantId;

    // 최근 제출 데이터 조회 (어제 제외)
    const recentSnapshot = await db
      .collection('reading_submissions')
      .where('participantId', '==', participantId)
      .orderBy('submittedAt', 'desc')
      .limit(10)
      .get();

    // 어제 제외하고 가장 최근 데이터 찾기
    const recentDoc = recentSnapshot.docs.find(doc => {
      const data = doc.data();
      return data.submissionDate !== yesterdayDate;
    });

    if (!recentDoc) {
      console.log(`❌ ${participantId}: 최근 데이터 없음 (업데이트 불가)`);
      noDataCount++;
      continue;
    }

    const recentData = recentDoc.data();

    // 업데이트할 정보
    const updateData: any = {};

    if (recentData.bookCoverUrl) {
      updateData.bookCoverUrl = recentData.bookCoverUrl;
    }

    if (recentData.bookAuthor) {
      updateData.bookAuthor = recentData.bookAuthor;
    }

    if (recentData.bookDescription) {
      updateData.bookDescription = recentData.bookDescription;
    }

    // 업데이트
    if (Object.keys(updateData).length > 0) {
      await temp.docRef.update(updateData);

      console.log(`✅ ${participantId}:`);
      console.log(`   제목: "${recentData.bookTitle}"`);
      console.log(`   저자: ${updateData.bookAuthor || '(없음)'}`);
      console.log(`   표지: ${updateData.bookCoverUrl ? '있음' : '없음'}`);
      console.log(`   설명: ${updateData.bookDescription ? '있음' : '없음'}`);

      updatedCount++;
    } else {
      console.log(`⚠️  ${participantId}: 업데이트할 정보 없음`);
    }
  }

  console.log(`\n📊 업데이트 완료`);
  console.log(`   - 성공: ${updatedCount}명`);
  console.log(`   - 실패 (데이터 없음): ${noDataCount}명`);
  console.log(`\n✅ 작업 완료!\n`);
}

updateTempSubmissions()
  .then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
