/**
 * 중복 제출 찾기
 */

import * as admin from 'firebase-admin';
import { resolve } from 'path';

function initAdmin() {
  if (admin.apps.length > 0) return admin.app();
  const serviceAccountPath = resolve(process.cwd(), 'firebase-service-account.json');
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

async function findDuplicateSubmission() {
  const app = initAdmin();
  const db = app.firestore();

  const yesterday = '2025-10-11';
  const yesterdayQuestion = '일상에서 가장 즐거움이나 몰입감을 느끼는 순간은 언제인가요?';

  console.log('🔍 중복 제출 찾기\n');

  // 어제 제출된 모든 submissions 조회
  const submissionsSnapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', yesterday)
    .where('dailyQuestion', '==', yesterdayQuestion)
    .get();

  console.log(`📋 전체 제출: ${submissionsSnapshot.size}개\n`);

  // 참가자별 제출 횟수 카운트
  const submissionCounts = new Map<string, number>();
  const submissionDetails = new Map<string, Array<{ docId: string; bookTitle: string; createdAt: any }>>();

  submissionsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const participantId = data.participantId;

    submissionCounts.set(participantId, (submissionCounts.get(participantId) || 0) + 1);

    if (!submissionDetails.has(participantId)) {
      submissionDetails.set(participantId, []);
    }
    submissionDetails.get(participantId)!.push({
      docId: doc.id,
      bookTitle: data.bookTitle,
      createdAt: data.createdAt,
    });
  });

  // 중복 제출자 찾기
  console.log('👥 참가자별 제출 횟수:\n');

  let duplicateFound = false;
  for (const [participantId, count] of submissionCounts.entries()) {
    const participantDoc = await db.collection('participants').doc(participantId).get();
    const name = participantDoc.exists ? participantDoc.data()?.name : '알 수 없음';

    if (count > 1) {
      console.log(`⚠️ ${participantId} (${name}): ${count}번 제출`);
      const details = submissionDetails.get(participantId)!;
      details.forEach((detail, index) => {
        const timestamp = detail.createdAt?.toDate?.() || detail.createdAt;
        console.log(`   ${index + 1}. 문서 ID: ${detail.docId}`);
        console.log(`      책: ${detail.bookTitle}`);
        console.log(`      생성 시각: ${timestamp}`);
      });
      console.log('');
      duplicateFound = true;
    } else {
      console.log(`✅ ${participantId} (${name}): 1번 제출`);
    }
  }

  if (!duplicateFound) {
    console.log('\n✅ 중복 제출 없음');
  } else {
    console.log('\n💡 중복 제출 처리 방안:');
    console.log('   1. 최신 제출만 유지하고 이전 제출 삭제');
    console.log('   2. 또는 그냥 두기 (hooks에서 Set으로 중복 제거되므로 카운트에는 영향 없음)');
  }
}

findDuplicateSubmission()
  .then(() => {
    console.log('\n✅ 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 에러:', error);
    process.exit(1);
  });
