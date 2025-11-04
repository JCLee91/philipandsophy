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

async function findLongestAnswersCohort2() {
  try {
    console.log('=== 2기 참가자 중 가장 긴 답변 찾기 ===\n');

    // 1. 2기 참가자 목록 가져오기 (cohortId가 2인 유저들)
    const usersSnapshot = await db.collection('users')
      .where('cohortId', '==', '2')
      .get();

    console.log(`2기 참가자 수: ${usersSnapshot.size}명\n`);

    let longestValue = { text: '', length: 0, userId: '', userName: '', field: '' };
    let longestReview = { text: '', length: 0, userId: '', userName: '', bookTitle: '', submissionId: '' };

    // 2. 각 참가자의 프로필과 제출물 조회
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userName = userDoc.data()?.name || 'Unknown';

      console.log(`처리 중: ${userName} (${userId})`);

      // 프로필 데이터 - 가치관 답변
      const profileDoc = await db.collection('profiles').doc(userId).get();

      if (profileDoc.exists) {
        const profileData = profileDoc.data();

        // 모든 텍스트 필드 검사
        for (const [key, value] of Object.entries(profileData || {})) {
          if (typeof value === 'string' && value.length > longestValue.length) {
            // 가치관 관련 필드인지 확인
            if (
              key.toLowerCase().includes('value') ||
              key.toLowerCase().includes('philosophy') ||
              key.toLowerCase().includes('belief') ||
              key.toLowerCase().includes('principle')
            ) {
              longestValue = {
                text: value,
                length: value.length,
                userId,
                userName,
                field: key
              };
            }
          }
        }
      }

      // 제출물 데이터 - 독서 소감
      const submissionsSnapshot = await db.collection('submissions')
        .where('userId', '==', userId)
        .get();

      submissionsSnapshot.forEach(doc => {
        const submission = doc.data();

        // 여러 가능한 필드명 체크
        const reviewFields = [
          'review',
          'bookReview',
          'thoughts',
          'reflection',
          '감상',
          '소감'
        ];

        for (const field of reviewFields) {
          const review = submission[field];
          if (typeof review === 'string' && review.length > longestReview.length) {
            longestReview = {
              text: review,
              length: review.length,
              userId,
              userName,
              bookTitle: submission.bookTitle || submission.title || 'Unknown',
              submissionId: doc.id
            };
          }
        }
      });
    }

    // 결과 출력
    console.log('\n\n=== 📊 결과 ===\n');

    if (longestValue.length > 0) {
      console.log('📌 가장 긴 가치관 답변:');
      console.log(`작성자: ${longestValue.userName}`);
      console.log(`필드: ${longestValue.field}`);
      console.log(`길이: ${longestValue.length}자`);
      console.log(`\n내용:\n${longestValue.text}\n`);
      console.log('─'.repeat(80));
    } else {
      console.log('❌ 가치관 답변을 찾을 수 없습니다.\n');
    }

    if (longestReview.length > 0) {
      console.log('\n📚 가장 긴 독서 소감:');
      console.log(`작성자: ${longestReview.userName}`);
      console.log(`책 제목: ${longestReview.bookTitle}`);
      console.log(`길이: ${longestReview.length}자`);
      console.log(`\n내용:\n${longestReview.text}\n`);
      console.log('─'.repeat(80));
    } else {
      console.log('\n❌ 독서 소감을 찾을 수 없습니다.\n');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

findLongestAnswersCohort2();
