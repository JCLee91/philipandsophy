import * as admin from 'firebase-admin';
import * as fs from 'fs';

// Firebase Admin SDK 초기화
const serviceAccount = JSON.parse(
  fs.readFileSync('./firebase-service-account.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://philipandsophy.firebaseio.com'
});

const db = admin.firestore();

async function findLongestAnswersCohort2() {
  try {
    console.log('=== 2기 참가자 중 가장 긴 답변 찾기 ===\n');

    // 1. 2기 참가자 목록 가져오기
    const cohort2Snapshot = await db.collection('cohorts').doc('cohort2').get();

    if (!cohort2Snapshot.exists) {
      console.log('2기 데이터를 찾을 수 없습니다.');
      return;
    }

    const cohort2Data = cohort2Snapshot.data();
    const participantIds = cohort2Data?.participantIds || [];

    console.log(`2기 참가자 수: ${participantIds.length}명\n`);

    let longestValue = { text: '', length: 0, userId: '', userName: '', field: '' };
    let longestReview = { text: '', length: 0, userId: '', userName: '', bookTitle: '' };

    // 2. 각 참가자의 프로필과 제출물 조회
    for (const userId of participantIds) {
      // 유저 정보
      const userDoc = await db.collection('users').doc(userId).get();
      const userName = userDoc.exists ? userDoc.data()?.name : 'Unknown';

      // 프로필 데이터 - 가치관 답변
      const profileDoc = await db.collection('profiles').doc(userId).get();

      if (profileDoc.exists) {
        const profileData = profileDoc.data();

        // 가치관 관련 필드 찾기
        const valueFields = [
          'value1', 'value2', 'value3',
          'values', 'myValues',
          'importantValues',
          'lifeValues'
        ];

        for (const field of valueFields) {
          const value = profileData?.[field];
          if (typeof value === 'string' && value.length > longestValue.length) {
            longestValue = {
              text: value,
              length: value.length,
              userId,
              userName,
              field
            };
          }
        }

        // 배열인 경우도 체크
        if (Array.isArray(profileData?.values)) {
          const combinedValues = profileData.values.join(' ');
          if (combinedValues.length > longestValue.length) {
            longestValue = {
              text: combinedValues,
              length: combinedValues.length,
              userId,
              userName,
              field: 'values (array)'
            };
          }
        }
      }

      // 제출물 데이터 - 독서 소감
      const submissionsSnapshot = await db.collection('submissions')
        .where('userId', '==', userId)
        .get();

      submissionsSnapshot.forEach(doc => {
        const submission = doc.data();
        const review = submission.review || submission.bookReview || submission.thoughts || '';

        if (typeof review === 'string' && review.length > longestReview.length) {
          longestReview = {
            text: review,
            length: review.length,
            userId,
            userName,
            bookTitle: submission.bookTitle || submission.title || 'Unknown'
          };
        }
      });
    }

    // 결과 출력
    console.log('=== 결과 ===\n');

    if (longestValue.length > 0) {
      console.log('📌 가장 긴 가치관 답변:');
      console.log(`작성자: ${longestValue.userName} (${longestValue.userId})`);
      console.log(`필드: ${longestValue.field}`);
      console.log(`길이: ${longestValue.length}자`);
      console.log(`내용:\n${longestValue.text}\n`);
    } else {
      console.log('가치관 답변을 찾을 수 없습니다.\n');
    }

    if (longestReview.length > 0) {
      console.log('\n📚 가장 긴 독서 소감:');
      console.log(`작성자: ${longestReview.userName} (${longestReview.userId})`);
      console.log(`책 제목: ${longestReview.bookTitle}`);
      console.log(`길이: ${longestReview.length}자`);
      console.log(`내용:\n${longestReview.text}\n`);
    } else {
      console.log('독서 소감을 찾을 수 없습니다.\n');
    }

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

findLongestAnswersCohort2();
