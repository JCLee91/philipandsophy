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
    console.log('=== 전체 데이터에서 가장 긴 답변 찾기 ===\n');

    let longestValue = { text: '', length: 0, userId: '', userName: '', field: '', cohortId: '' };
    let longestReview = { text: '', length: 0, userId: '', userName: '', bookTitle: '', cohortId: '' };

    // 1. participants 컬렉션 조회
    const participantsSnapshot = await db.collection('participants').get();
    console.log(`총 participants 수: ${participantsSnapshot.size}명\n`);

    if (participantsSnapshot.size === 0) {
      console.log('❌ participants 컬렉션이 비어있습니다.\n');
      return;
    }

    // 2기만 필터링 (cohortId가 '2'인 경우)
    const cohort2Participants = participantsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.cohortId === '2';
    });

    console.log(`2기 participants 수: ${cohort2Participants.length}명\n`);

    for (const participantDoc of cohort2Participants) {
      const participantData = participantDoc.data();
      const userId = participantDoc.id;
      const userName = participantData.name || 'Unknown';
      const cohortId = participantData.cohortId || 'Unknown';

      console.log(`처리 중: ${userName} (${userId}) - Cohort ${cohortId}`);

      // 프로필 데이터 조회
      const profileDoc = await db.collection('profiles').doc(userId).get();

      if (profileDoc.exists) {
        const profileData = profileDoc.data();

        // 모든 텍스트 필드 검사
        for (const [key, value] of Object.entries(profileData || {})) {
          if (typeof value === 'string' && value.trim().length > 10) {
            // 10자 이상만
            if (value.length > longestValue.length) {
              longestValue = {
                text: value,
                length: value.length,
                userId,
                userName,
                field: key,
                cohortId
              };
            }
          }
        }
      }

      // 제출물 데이터 조회
      const submissionsSnapshot = await db.collection('submissions')
        .where('userId', '==', userId)
        .get();

      submissionsSnapshot.forEach(doc => {
        const submission = doc.data();

        // 여러 가능한 필드명 체크
        const reviewFields = ['review', 'bookReview', 'thoughts', 'reflection', 'content'];

        for (const field of reviewFields) {
          const review = submission[field];
          if (typeof review === 'string' && review.trim().length > 10) {
            // 10자 이상만
            if (review.length > longestReview.length) {
              longestReview = {
                text: review,
                length: review.length,
                userId,
                userName,
                bookTitle: submission.bookTitle || submission.title || 'Unknown',
                cohortId
              };
            }
          }
        }
      });
    }

    // 결과 출력
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 결과');
    console.log('='.repeat(80) + '\n');

    if (longestValue.length > 0) {
      console.log('📌 가장 긴 가치관/프로필 답변:');
      console.log(`작성자: ${longestValue.userName} (Cohort ${longestValue.cohortId})`);
      console.log(`필드: ${longestValue.field}`);
      console.log(`길이: ${longestValue.length}자`);
      console.log(`\n내용:\n${longestValue.text}\n`);
      console.log('─'.repeat(80) + '\n');
    } else {
      console.log('❌ 가치관/프로필 답변을 찾을 수 없습니다.\n');
    }

    if (longestReview.length > 0) {
      console.log('📚 가장 긴 독서 소감:');
      console.log(`작성자: ${longestReview.userName} (Cohort ${longestReview.cohortId})`);
      console.log(`책 제목: ${longestReview.bookTitle}`);
      console.log(`길이: ${longestReview.length}자`);
      console.log(`\n내용:\n${longestReview.text}\n`);
      console.log('─'.repeat(80));
    } else {
      console.log('❌ 독서 소감을 찾을 수 없습니다.\n');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

findLongestAnswers();
