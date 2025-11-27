#!/usr/bin/env tsx
/**
 * 기간 외 인증 확인 스크립트
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';
import { format, parseISO } from 'date-fns';

function safeTimestampToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return null;
}

async function checkOutOfRangeSubmissions(cohortId: string) {
  const { db } = getFirebaseAdmin();

  const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
  const cohortData = cohortDoc.data();
  const cohortStartDate = parseISO(cohortData.startDate);
  const cohortEndDate = parseISO(cohortData.endDate);

  console.log(`\n코호트: ${cohortData.name}`);
  console.log(`시작일: ${cohortData.startDate} (OT)`);
  console.log(`종료일: ${cohortData.endDate}`);
  console.log(`인증 가능 기간: ${format(new Date(cohortStartDate.getTime() + 86400000), 'yyyy-MM-dd')} ~ ${cohortData.endDate}`);

  // 참가자 조회
  const participantsSnapshot = await db.collection('participants')
    .where('cohortId', '==', cohortId)
    .get();

  const excludedIds = new Set<string>();
  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.isSuperAdmin || data.isAdministrator || data.isGhost) {
      excludedIds.add(doc.id);
    }
  });

  const targetParticipantIds = participantsSnapshot.docs
    .filter(doc => !excludedIds.has(doc.id))
    .map(doc => doc.id);

  // 해당 코호트 모든 인증 조회
  const allSubmissionsSnapshot = await db.collection('reading_submissions').get();
  const cohortSubmissions = allSubmissionsSnapshot.docs.filter(d => {
    const data = d.data();
    return targetParticipantIds.includes(data.participantId) && data.status !== 'draft';
  });

  console.log(`\n총 인증 수: ${cohortSubmissions.length}개`);

  // OT 날짜 또는 종료일 이후 인증 찾기
  const otDate = format(cohortStartDate, 'yyyy-MM-dd');
  const endDateStr = cohortData.endDate;

  console.log('\n기간 외 인증:');
  console.log('-'.repeat(60));

  let outOfRangeCount = 0;
  cohortSubmissions.forEach((doc) => {
    const data = doc.data();
    const submittedAt = safeTimestampToDate(data.submittedAt);
    if (!submittedAt) return;

    const dateStr = format(submittedAt, 'yyyy-MM-dd');

    // OT 날짜이거나 종료일 이후인 경우
    if (dateStr === otDate || dateStr > endDateStr || dateStr < otDate) {
      outOfRangeCount++;
      console.log(`  - ${dateStr}: ${data.participantId} (docId: ${doc.id})`);
    }
  });

  if (outOfRangeCount === 0) {
    console.log('  없음');
  } else {
    console.log(`\n총 기간 외 인증: ${outOfRangeCount}개`);
  }
}

const cohortId = process.argv[2] || '3';
checkOutOfRangeSubmissions(cohortId)
  .then(() => {
    console.log('\n✅ 완료\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 에러:', error);
    process.exit(1);
  });
