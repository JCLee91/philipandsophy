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

async function findJongchanLongestAnswers() {
  try {
    console.log('=== 종찬님 데이터 조회 시작 ===\n');

    // 1. 종찬님 유저 정보 찾기 (이름으로 검색)
    const usersSnapshot = await db.collection('users')
      .where('name', '==', '종찬')
      .get();

    if (usersSnapshot.empty) {
      console.log('종찬님 유저 데이터를 찾을 수 없습니다.');

      // 다른 이름 패턴으로도 시도
      const alternativeSnapshot = await db.collection('users')
        .where('name', '==', '이종찬')
        .get();

      if (alternativeSnapshot.empty) {
        console.log('이종찬님 유저 데이터도 찾을 수 없습니다.');
        return;
      }

      usersSnapshot.docs = alternativeSnapshot.docs;
    }

    console.log(`총 ${usersSnapshot.size}명의 종찬님을 찾았습니다.\n`);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      console.log(`\n📌 유저 정보:`);
      console.log(`ID: ${userId}`);
      console.log(`이름: ${userData.name}`);
      console.log(`이메일: ${userData.email || 'N/A'}`);

      // 2. 프로필 데이터 조회
      const profileDoc = await db.collection('profiles').doc(userId).get();

      if (profileDoc.exists) {
        const profileData = profileDoc.data();
        console.log(`\n=== 프로필 데이터 ===`);

        // 가치관 답변 (values 필드들)
        const valueFields = Object.keys(profileData || {})
          .filter(key => key.startsWith('value') || key.includes('Values'));

        let longestValueAnswer = '';
        let longestValueField = '';

        valueFields.forEach(field => {
          const value = profileData[field];
          if (typeof value === 'string' && value.length > longestValueAnswer.length) {
            longestValueAnswer = value;
            longestValueField = field;
          }
        });

        if (longestValueAnswer) {
          console.log(`\n🎯 가장 긴 가치관 답변:`);
          console.log(`필드: ${longestValueField}`);
          console.log(`길이: ${longestValueAnswer.length}자`);
          console.log(`내용: ${longestValueAnswer}`);
        }
      }

      // 3. 제출물(submissions) 조회 - 독서 소감
      const submissionsSnapshot = await db.collection('submissions')
        .where('userId', '==', userId)
        .get();

      console.log(`\n📚 제출물 개수: ${submissionsSnapshot.size}개`);

      let longestBookReview = '';
      let longestBookTitle = '';
      let longestSubmissionId = '';

      submissionsSnapshot.forEach(doc => {
        const submission = doc.data();
        const review = submission.review || submission.bookReview || submission.thoughts || '';

        if (review && review.length > longestBookReview.length) {
          longestBookReview = review;
          longestBookTitle = submission.bookTitle || submission.title || 'N/A';
          longestSubmissionId = doc.id;
        }
      });

      if (longestBookReview) {
        console.log(`\n📖 가장 긴 독서 소감:`);
        console.log(`제출물 ID: ${longestSubmissionId}`);
        console.log(`책 제목: ${longestBookTitle}`);
        console.log(`길이: ${longestBookReview.length}자`);
        console.log(`내용: ${longestBookReview}`);
      } else {
        console.log('\n독서 소감을 찾을 수 없습니다.');
      }

      // 4. 모든 텍스트 필드 통계
      console.log(`\n\n=== 전체 텍스트 길이 통계 ===`);

      if (profileDoc.exists) {
        const profileData = profileDoc.data();
        const textFields = Object.entries(profileData || {})
          .filter(([_, value]) => typeof value === 'string')
          .sort((a, b) => (b[1] as string).length - (a[1] as string).length);

        console.log('\n프로필 텍스트 필드 (길이순):');
        textFields.slice(0, 10).forEach(([key, value]) => {
          console.log(`  ${key}: ${(value as string).length}자`);
        });
      }

      if (submissionsSnapshot.size > 0) {
        const reviewLengths = submissionsSnapshot.docs
          .map(doc => {
            const data = doc.data();
            const review = data.review || data.bookReview || data.thoughts || '';
            return {
              id: doc.id,
              title: data.bookTitle || data.title || 'N/A',
              length: review.length
            };
          })
          .filter(item => item.length > 0)
          .sort((a, b) => b.length - a.length);

        console.log('\n독서 소감 길이 (길이순):');
        reviewLengths.slice(0, 10).forEach(item => {
          console.log(`  ${item.title}: ${item.length}자`);
        });
      }
    }

    console.log('\n\n=== 조회 완료 ===');

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

findJongchanLongestAnswers();
