import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp({
    projectId: 'philipandsophy',
  });
}

const db = getFirestore();

async function fixWonwooSubmissionTime() {
  try {
    console.log('🔍 원우님의 10/27 제출물 찾는 중...');

    // 원우님의 10/27 제출물 찾기
    const submissionsRef = db.collection('reading_submissions');
    const snapshot = await submissionsRef
      .where('participantId', '==', 'cohort2-원우')
      .where('submissionDate', '==', '2025-10-27')
      .get();

    if (snapshot.empty) {
      console.log('❌ 원우님의 10/27 제출물을 찾을 수 없습니다.');
      return;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log('📄 현재 제출물 정보:');
    console.log(`  - Document ID: ${doc.id}`);
    console.log(`  - Participant: ${data.participantId}`);
    console.log(`  - Submission Date: ${data.submissionDate}`);
    const currentTime = data.submittedAt ? data.submittedAt.toDate() : 'N/A';
    console.log(`  - Submitted At: ${currentTime}`);

    // 10/27 23:50:00 KST로 변경 (보상 로직에서 제외)
    const newTimestamp = Timestamp.fromDate(new Date('2025-10-27T23:50:00+09:00'));

    await doc.ref.update({
      submittedAt: newTimestamp
    });

    console.log('✅ 제출 시간 변경 완료!');
    console.log(`  - 새 시간: ${newTimestamp.toDate()}`);
    console.log('  - 원우님은 이제 10/28 오늘의 질문을 받게 됩니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

fixWonwooSubmissionTime();
