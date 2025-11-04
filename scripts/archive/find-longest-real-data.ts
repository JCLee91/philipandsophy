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
    console.log('=== 2기 데이터에서 가장 긴 답변 찾기 ===\n');

    let longestValue = { text: '', length: 0, userId: '', userName: '', field: '' };
    let longestReview = { text: '', length: 0, userId: '', userName: '', bookTitle: '' };

    // 1. 모든 profiles 조회
    const profilesSnapshot = await db.collection('profiles').get();
    console.log(`총 프로필 수: ${profilesSnapshot.size}개\n`);

    // 프로필 데이터에서 가장 긴 텍스트 찾기
    for (const profileDoc of profilesSnapshot.docs) {
      const userId = profileDoc.id;
      const profileData = profileDoc.data();

      // 2기인지 확인
      const participantDoc = await db.collection('participants').doc(userId).get();
      if (!participantDoc.exists || participantDoc.data()?.cohortId !== '2') {
        continue; // 2기가 아니면 건너뛰기
      }

      const userName = participantDoc.data()?.name || 'Unknown';

      // 모든 필드 검사
      for (const [key, value] of Object.entries(profileData)) {
        if (typeof value === 'string' && value.trim().length > 20) {
          if (value.length > longestValue.length) {
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

    // 2. 모든 submissions 조회
    const submissionsSnapshot = await db.collection('submissions').get();
    console.log(`총 제출물 수: ${submissionsSnapshot.size}개\n`);

    for (const submissionDoc of submissionsSnapshot.docs) {
      const submission = submissionDoc.data();
      const userId = submission.userId;

      // 2기인지 확인
      const participantDoc = await db.collection('participants').doc(userId).get();
      if (!participantDoc.exists || participantDoc.data()?.cohortId !== '2') {
        continue;
      }

      const userName = participantDoc.data()?.name || 'Unknown';

      // 독서 소감 찾기
      const review = submission.review || submission.bookReview || submission.thoughts || '';
      if (typeof review === 'string' && review.trim().length > 20) {
        if (review.length > longestReview.length) {
          longestReview = {
            text: review,
            length: review.length,
            userId,
            userName,
            bookTitle: submission.bookTitle || submission.title || 'Unknown'
          };
        }
      }
    }

    // 결과 출력
    console.log('\n' + '='.repeat(80));
    console.log('📊 2기 최장 답변 결과');
    console.log('='.repeat(80) + '\n');

    if (longestValue.length > 0) {
      console.log('📌 가장 긴 프로필 답변:');
      console.log(`작성자: ${longestValue.userName}`);
      console.log(`필드명: ${longestValue.field}`);
      console.log(`📏 길이: ${longestValue.length}자`);
      console.log(`\n내용 미리보기:\n${longestValue.text.substring(0, 200)}...`);
      console.log('\n' + '─'.repeat(80) + '\n');
    } else {
      console.log('❌ 프로필 답변을 찾을 수 없습니다.\n');
    }

    if (longestReview.length > 0) {
      console.log('📚 가장 긴 독서 소감:');
      console.log(`작성자: ${longestReview.userName}`);
      console.log(`책 제목: ${longestReview.bookTitle}`);
      console.log(`📏 길이: ${longestReview.length}자`);
      console.log(`\n내용 미리보기:\n${longestReview.text.substring(0, 200)}...`);
      console.log('\n' + '─'.repeat(80));
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
