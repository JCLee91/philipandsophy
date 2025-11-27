#!/usr/bin/env tsx
/**
 * 활동 추이 그래프 데이터 검증 스크립트
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';
import { format, parseISO, differenceInDays, addDays, endOfDay } from 'date-fns';

function hasAnyPushSubscription(data: any): boolean {
  const hasMultiDeviceToken =
    Array.isArray(data.pushTokens) &&
    data.pushTokens.some(
      (entry: any) => typeof entry?.token === 'string' && entry.token.trim().length > 0
    );

  const hasWebPushSubscription =
    Array.isArray(data.webPushSubscriptions) &&
    data.webPushSubscriptions.some(
      (sub: any) => typeof sub?.endpoint === 'string' && sub.endpoint.trim().length > 0
    );

  const hasLegacyToken = typeof data.pushToken === 'string' && data.pushToken.trim().length > 0;

  return hasMultiDeviceToken || hasWebPushSubscription || hasLegacyToken;
}

function safeTimestampToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return null;
}

async function verifyActivityChart(cohortId: string) {
  const { db } = getFirebaseAdmin();

  console.log('\n📊 활동 추이 그래프 데이터 검증\n');
  console.log('='.repeat(80));

  // 코호트 정보 조회
  const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
  if (!cohortDoc.exists) {
    console.log('코호트를 찾을 수 없습니다');
    return;
  }

  const cohortData = cohortDoc.data();
  const cohortStartDate = parseISO(cohortData.startDate);
  const cohortEndDate = parseISO(cohortData.endDate);

  console.log(`코호트: ${cohortData.name}`);
  console.log(`시작일: ${cohortData.startDate}`);
  console.log(`종료일: ${cohortData.endDate}`);

  const startDate = new Date(cohortStartDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(cohortEndDate);
  endDate.setHours(23, 59, 59, 999);

  const totalDays = differenceInDays(endDate, startDate);
  console.log(`총 일수 (OT 제외): ${totalDays}일`);

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

  console.log(`대상 참가자: ${targetParticipantIds.length}명`);

  // 독서 인증 조회
  const submissionsSnapshot = await db.collection('reading_submissions')
    .where('submittedAt', '>=', startDate)
    .get();

  const filteredSubmissions = submissionsSnapshot.docs.filter(d => {
    const data = d.data();
    return targetParticipantIds.includes(data.participantId) && data.status !== 'draft';
  });

  console.log(`\n전체 인증 (기간 내, draft 제외): ${filteredSubmissions.length}개`);

  // 날짜별 집계
  console.log('\n' + '='.repeat(80));
  console.log('날짜별 인증 현황 (OT 첫날 제외)');
  console.log('='.repeat(80));
  console.log('| 날짜       | 인증 수 | 푸시 허용 | 평균 리뷰 길이 |');
  console.log('|------------|--------|----------|--------------|');

  const activityMap = new Map<string, { submissions: number; totalReviewLength: number }>();

  // 날짜 초기화 (OT 제외: i=1부터)
  for (let i = 1; i <= totalDays; i++) {
    const date = addDays(startDate, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    activityMap.set(dateStr, { submissions: 0, totalReviewLength: 0 });
  }

  // 인증 집계
  filteredSubmissions.forEach((doc) => {
    const data = doc.data();
    const submittedAt = safeTimestampToDate(data.submittedAt);
    if (!submittedAt) return;

    const dateStr = format(submittedAt, 'yyyy-MM-dd');
    const activity = activityMap.get(dateStr);
    if (activity) {
      activity.submissions += 1;
      activity.totalReviewLength += (data.review || '').length;
    }
  });

  // 결과 출력
  let totalSubmissions = 0;
  Array.from(activityMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([date, activity]) => {
      const avgReview = activity.submissions > 0
        ? Math.round(activity.totalReviewLength / activity.submissions)
        : 0;
      console.log(`| ${date} | ${String(activity.submissions).padStart(6)} | ${String('-').padStart(8)} | ${String(avgReview).padStart(12)} |`);
      totalSubmissions += activity.submissions;
    });

  console.log('='.repeat(80));
  console.log(`총 인증 합계: ${totalSubmissions}개`);

  // 검증: 합계가 맞는지
  if (totalSubmissions === filteredSubmissions.length) {
    console.log('✅ 날짜별 합계와 전체 인증 수가 일치합니다.');
  } else {
    console.log(`⚠️ 불일치! 날짜별 합계: ${totalSubmissions}, 전체: ${filteredSubmissions.length}`);
    console.log('   → 일부 인증이 기간 외 날짜에 제출되었을 수 있음');
  }
}

const cohortId = process.argv[2] || '3';
verifyActivityChart(cohortId)
  .then(() => {
    console.log('\n✅ 검증 완료\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 에러 발생:', error);
    process.exit(1);
  });
