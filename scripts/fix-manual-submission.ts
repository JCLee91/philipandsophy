/**
 * 잘못 추가된 독서 인증 삭제 후 재추가
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const db = getFirestore(app, 'seoul');

async function fixSubmission() {
  try {
    const wrongDocId = 'CqsqnmmAYla7MaqLcP9Y';

    console.log('🗑️  기존 문서 삭제 중...');
    await db.collection('reading_submissions').doc(wrongDocId).delete();
    console.log('✅ 삭제 완료\n');

    // 참가자 정보 조회
    const participantId = 'cohort3-지현';
    const participantDoc = await db.collection('participants').doc(participantId).get();
    const participant = participantDoc.data();

    console.log('✅ 참가자 정보 확인:', {
      id: participantId,
      name: participant?.name,
      cohortId: participant?.cohortId
    });

    // 제출 데이터 준비 (올바른 필드명)
    const submissionDate = '2025-11-09';
    const submittedAt = Timestamp.fromDate(new Date('2025-11-09T22:00:00+09:00'));

    const submissionData = {
      participantId,
      participationCode: participantId, // participationCode = participantId
      cohortId: participant?.cohortId,
      submissionDate,
      submittedAt,
      bookTitle: '아름다운 여름',
      bookImageUrl: '', // 나중에 업데이트 예정
      review: `"그 시절의 삶은 마치 끝이 없는 축제 같았다"라는 구절이 가장 마음에 와닿았습니다.
이 문장은 한때의 시간이 얼마나 생동하고 충만했는지를 과장 없이 정확하게 보여주는 표현이라고 느꼈습니다.
그 문장을 읽는 순간, 저 역시 지나온 시절의 분위기와 감정이 자연스럽게 떠올랐습니다. 잊고 지냈던 장면들이 단순한 회상이 아니라, 여전히 제 안에 남아 있다는 생각이 들었습니다.
과도한 감정이나 미화 없이도, 그 시절의 의미를 또렷하게 전해주는 문장이라 더욱 깊은 인상을 남겼습니다. 아름다운 여름이라는 제목이 이 문장 하나로 완벽히 표현되었습니다.`,
      dailyQuestion: '인생에서의 성공이란 무엇인가요?',
      dailyAnswer: `저는 인생에서의 성공을 하나의 결과나 단일한 성취로 보지 않습니다.
성공은 어느 시점에 갑자기 도달하는 것이 아니라,
그때그때 내린 선택들과 그 선택이 만들어낸 경험들이 축적되어 형성된 현재의 모습이라고 생각합니다.
우리가 어떤 길을 택하고, 어떤 관계를 맺으며, 어떤 책임을 감수해 왔는지가
지금의 저를 이루고 있으며, 그 자체가 이미 하나의 성공이라고 믿습니다.
그렇기에 성공은 먼 미래의 목표보다 지금 이 순간을 어떻게 쌓아가고 있는가와 더 밀접하다고 봅니다.
결국 성공은 결과가 아니라,
순간의 선택들이 모여 이어져 온 지속적인 과정이라고 생각합니다.`,
      status: 'approved',
      createdAt: submittedAt,
      updatedAt: submittedAt,
    };

    // Firestore에 추가
    const docRef = await db.collection('reading_submissions').add(submissionData);

    console.log('\n✅ 독서 인증 재추가 완료!');
    console.log('   Document ID:', docRef.id);
    console.log('   제출 날짜:', submissionDate);
    console.log('   제출 시간:', submittedAt.toDate().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    console.log('   책 제목:', submissionData.bookTitle);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
fixSubmission()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
