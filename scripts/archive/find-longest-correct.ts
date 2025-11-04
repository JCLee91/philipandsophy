import * as admin from 'firebase-admin';
import * as fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('./firebase-service-account.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://philipandsophy.firebaseio.com'
});

const db = admin.firestore();

async function findLongestAnswers() {
  try {
    console.log('=== 2기 참가자의 가장 긴 답변 찾기 ===\n');

    // 1. 2기 참가자 목록 가져오기
    const participantsSnapshot = await db.collection('participants')
      .where('cohortId', '==', '2')
      .get();

    console.log(`2기 참가자 수: ${participantsSnapshot.size}명\n`);

    const cohort2ParticipantIds = participantsSnapshot.docs.map(doc => doc.id);
    const participantNames = new Map();

    participantsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      participantNames.set(doc.id, data.name || doc.id);
    });

    let longestAnswer = {
      text: '',
      length: 0,
      participantId: '',
      participantName: '',
      field: 'dailyAnswer'
    };

    let longestReview = {
      text: '',
      length: 0,
      participantId: '',
      participantName: '',
      bookTitle: ''
    };

    // 2. reading_submissions에서 2기 참가자의 제출물 조회
    const submissionsSnapshot = await db.collection('reading_submissions')
      .where('participantId', 'in', cohort2ParticipantIds.slice(0, 10)) // Firestore 'in' 쿼리는 최대 10개
      .get();

    console.log(`조회된 제출물 수: ${submissionsSnapshot.size}개\n`);

    // 나머지 참가자들도 조회 (10개씩 나눠서)
    for (let i = 10; i < cohort2ParticipantIds.length; i += 10) {
      const batch = cohort2ParticipantIds.slice(i, i + 10);
      const batchSnapshot = await db.collection('reading_submissions')
        .where('participantId', 'in', batch)
        .get();

      console.log(`추가 조회된 제출물 수: ${batchSnapshot.size}개`);
    }

    // 모든 제출물 다시 조회 (더 효율적인 방법)
    const allSubmissionsSnapshot = await db.collection('reading_submissions').get();
    console.log(`\n전체 제출물 수: ${allSubmissionsSnapshot.size}개\n`);

    let processedCount = 0;

    allSubmissionsSnapshot.docs.forEach(doc => {
      const submission = doc.data();
      const participantId = submission.participantId;

      // 2기 참가자인지 확인
      if (!cohort2ParticipantIds.includes(participantId)) {
        return;
      }

      processedCount++;
      const participantName = participantNames.get(participantId) || participantId;

      // dailyAnswer 확인
      const dailyAnswer = submission.dailyAnswer || '';
      if (typeof dailyAnswer === 'string' && dailyAnswer.trim().length > 10) {
        if (dailyAnswer.length > longestAnswer.length) {
          longestAnswer = {
            text: dailyAnswer,
            length: dailyAnswer.length,
            participantId,
            participantName,
            field: 'dailyAnswer'
          };
        }
      }

      // review 확인
      const review = submission.review || '';
      if (typeof review === 'string' && review.trim().length > 10) {
        if (review.length > longestReview.length) {
          longestReview = {
            text: review,
            length: review.length,
            participantId,
            participantName,
            bookTitle: submission.bookTitle || 'Unknown'
          };
        }
      }
    });

    console.log(`2기 참가자의 제출물 수: ${processedCount}개\n`);

    // 결과 출력
    console.log('='.repeat(80));
    console.log('📊 결과');
    console.log('='.repeat(80) + '\n');

    if (longestAnswer.length > 0) {
      console.log('📌 가장 긴 가치관/Daily Answer:');
      console.log(`작성자: ${longestAnswer.participantName}`);
      console.log(`📏 길이: ${longestAnswer.length}자`);
      console.log(`\n전체 내용:\n${longestAnswer.text}\n`);
      console.log('─'.repeat(80) + '\n');
    } else {
      console.log('❌ Daily Answer를 찾을 수 없습니다.\n');
    }

    if (longestReview.length > 0) {
      console.log('📚 가장 긴 독서 소감:');
      console.log(`작성자: ${longestReview.participantName}`);
      console.log(`책 제목: ${longestReview.bookTitle}`);
      console.log(`📏 길이: ${longestReview.length}자`);
      console.log(`\n전체 내용:\n${longestReview.text}\n`);
      console.log('─'.repeat(80));
    } else {
      console.log('❌ 독서 소감을 찾을 수 없습니다.\n');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    process.exit(0);
  }
}

findLongestAnswers();
