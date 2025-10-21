/**
 * 어제 임시 인증 데이터의 책 정보를 그제 데이터로 업데이트
 *
 * 문제: 어제(10-20) 임시 인증 처리로 엉뚱한 책이 등록됨
 * 해결: 각 참가자의 그제(10-19) 또는 최근 책 정보로 어제 데이터 업데이트
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';
import { getDailyQuestionText } from '@/constants/daily-questions';

const db = getAdminDb();

async function fixYesterdayBooks() {
  console.log('\n📚 어제 임시 인증 데이터 책 정보 업데이트 시작...\n');

  const yesterdayDate = '2025-10-20';
  const dayBeforeYesterday = '2025-10-19';
  const wrongQuestion = '오늘 하루를 책과 함께 보내신 소감은 어떠신가요?';
  const correctQuestion = getDailyQuestionText(yesterdayDate);

  console.log(`✅ 올바른 질문: "${correctQuestion}"\n`);

  // 1. 그제(10-19) 제출 데이터 조회 (참가자별 책 정보)
  console.log(`📅 그제(${dayBeforeYesterday}) 제출 데이터 조회 중...\n`);

  const dayBeforeSnapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', dayBeforeYesterday)
    .get();

  const booksByParticipant = new Map<string, any>();

  dayBeforeSnapshot.docs.forEach(doc => {
    const data = doc.data();
    booksByParticipant.set(data.participantId, {
      bookTitle: data.bookTitle,
      bookAuthor: data.bookAuthor,
      bookCoverUrl: data.bookCoverUrl,  // 책 표지
      bookDescription: data.bookDescription,
      bookIsbn: data.bookIsbn,
    });
  });

  console.log(`✅ 그제 제출 데이터: ${booksByParticipant.size}명\n`);

  // 2. 어제(10-20) 잘못된 임시 인증 데이터 조회
  console.log(`📅 어제(${yesterdayDate}) 임시 인증 데이터 조회 중...\n`);

  const yesterdaySnapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', yesterdayDate)
    .where('dailyQuestion', '==', wrongQuestion)
    .get();

  console.log(`🔍 업데이트 대상: ${yesterdaySnapshot.size}개\n`);

  if (yesterdaySnapshot.size === 0) {
    console.log('❌ 업데이트할 데이터가 없습니다.');
    return;
  }

  // 3. 각 참가자의 그제 또는 최근 책 정보로 어제 데이터 업데이트
  let updatedCount = 0;
  let fallbackCount = 0;
  let imageErrorCount = 0;

  for (const doc of yesterdaySnapshot.docs) {
    const data = doc.data();
    const participantId = data.participantId;

    let bookInfo = booksByParticipant.get(participantId);

    // 그제 데이터 없으면 가장 최근 데이터 찾기
    if (!bookInfo) {
      console.log(`🔍 ${participantId}: 그제 데이터 없음, 최근 데이터 검색 중...`);

      const recentSnapshot = await db
        .collection('reading_submissions')
        .where('participantId', '==', participantId)
        .orderBy('submittedAt', 'desc')
        .limit(1)
        .get();

      if (!recentSnapshot.empty) {
        const recentData = recentSnapshot.docs[0].data();
        bookInfo = {
          bookTitle: recentData.bookTitle,
          bookAuthor: recentData.bookAuthor,
          bookCoverUrl: recentData.bookCoverUrl,  // 책 표지
          bookDescription: recentData.bookDescription,
          bookIsbn: recentData.bookIsbn,
        };
        console.log(`   → 최근 데이터 발견: "${bookInfo.bookTitle}"`);
        fallbackCount++;
      } else {
        console.log(`   ❌ 최근 데이터도 없음 (업데이트 불가)`);
        continue;
      }
    }

    // 책 표지 URL 확인
    if (!bookInfo.bookCoverUrl || bookInfo.bookCoverUrl.includes('placeholder')) {
      console.log(`⚠️  ${participantId}: 책 표지 URL 문제 - "${bookInfo.bookCoverUrl}"`);
      imageErrorCount++;
    }

    // 책 정보 + 질문 업데이트 (bookImageUrl은 건드리지 않음)
    await doc.ref.update({
      bookTitle: bookInfo.bookTitle,
      bookAuthor: bookInfo.bookAuthor,
      bookCoverUrl: bookInfo.bookCoverUrl,  // 책 표지만 업데이트
      bookDescription: bookInfo.bookDescription,
      bookIsbn: bookInfo.bookIsbn,
      dailyQuestion: correctQuestion,  // 질문도 수정
    });

    console.log(`✅ ${participantId}: "${bookInfo.bookTitle}" (${bookInfo.bookAuthor})`);
    updatedCount++;
  }

  console.log(`\n📊 업데이트 완료`);
  console.log(`   - 총 업데이트: ${updatedCount}개`);
  console.log(`   - 그제 데이터 사용: ${updatedCount - fallbackCount}개`);
  console.log(`   - 최근 데이터 사용 (fallback): ${fallbackCount}개`);
  console.log(`   - 사진 URL 문제: ${imageErrorCount}개`);
  console.log(`\n✅ 작업 완료!\n`);
}

fixYesterdayBooks()
  .then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
