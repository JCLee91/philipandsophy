#!/usr/bin/env tsx
/**
 * 엣지케이스 submission 수정 스크립트
 *
 * 김영훈_1202_0203: submissionDate를 2025-12-02 → 2025-12-01로 수정
 */

import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';

async function fixEdgeCaseSubmission() {
  const { db } = getFirebaseAdmin();

  const submissionId = '김영훈_1202_0203';
  const correctDate = '2025-12-01';

  console.log('🔧 엣지케이스 submission 수정 시작...\n');

  // 1. 현재 상태 확인
  const docRef = db.collection('reading_submissions').doc(submissionId);
  const doc = await docRef.get();

  if (!doc.exists) {
    console.error(`❌ submission을 찾을 수 없습니다: ${submissionId}`);
    process.exit(1);
  }

  const data = doc.data()!;
  console.log('현재 상태:');
  console.log(`  - ID: ${submissionId}`);
  console.log(`  - 참가자: ${data.participantId}`);
  console.log(`  - 책: ${data.bookTitle}`);
  console.log(`  - submissionDate: ${data.submissionDate}`);
  console.log('');

  // 2. submissionDate 수정
  console.log(`📝 submissionDate 수정: ${data.submissionDate} → ${correctDate}`);

  await docRef.update({
    submissionDate: correctDate,
    updatedAt: Timestamp.now(),
  });

  console.log('✅ submission 수정 완료!\n');

  // 3. 수정 결과 확인
  const updatedDoc = await docRef.get();
  const updatedData = updatedDoc.data()!;
  console.log('수정 후 상태:');
  console.log(`  - submissionDate: ${updatedData.submissionDate}`);

  process.exit(0);
}

fixEdgeCaseSubmission().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
