#!/usr/bin/env tsx
/**
 * 데이터센터 개요 통계 검증 스크립트
 *
 * API 로직과 동일한 방식으로 계산하여 실제 데이터와 비교합니다.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';
import { format } from 'date-fns';

// 푸시 구독 여부 확인 함수 (API와 동일 로직)
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

// submissionDate 계산 (새벽 2시 마감 정책)
function getSubmissionDate(): string {
  const now = new Date();
  const kstOffset = 9 * 60;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const kstTime = new Date(utcTime + kstOffset * 60000);

  // 새벽 2시 전이면 전날로 처리
  if (kstTime.getHours() < 2) {
    kstTime.setDate(kstTime.getDate() - 1);
  }

  return format(kstTime, 'yyyy-MM-dd');
}

async function verifyOverviewStats(cohortId?: string) {
  const { db } = getFirebaseAdmin();
  const todayString = getSubmissionDate();

  console.log('\n📊 데이터센터 개요 통계 검증\n');
  console.log('='.repeat(80));
  console.log(`검증 대상 코호트: ${cohortId || '전체'}`);
  console.log(`오늘 날짜 (submissionDate): ${todayString}`);
  console.log('='.repeat(80));

  // 1. 코호트 정보 조회
  let cohortData = null;
  let elapsedDays = 0;
  if (cohortId) {
    const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
    if (cohortDoc.exists) {
      cohortData = cohortDoc.data();
      const startDate = new Date(cohortData.startDate);
      const endDate = new Date(cohortData.endDate);
      const today = new Date(todayString);
      // 종료된 기수는 종료일까지만 계산
      const compareDate = today > endDate ? endDate : today;
      const daysDiff = Math.floor((compareDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      elapsedDays = Math.max(0, daysDiff - 1);
      console.log(`\n코호트 정보:`);
      console.log(`  - 이름: ${cohortData.name}`);
      console.log(`  - 시작일: ${cohortData.startDate}`);
      console.log(`  - 종료일: ${cohortData.endDate}`);
      console.log(`  - 경과 일수 (OT 제외): ${elapsedDays}일`);
      console.log(`  - 기수 상태: ${today > endDate ? '종료됨' : '진행 중'}`);
    }
  }

  // 2. 참가자 조회
  const participantsSnapshot = cohortId
    ? await db.collection('participants').where('cohortId', '==', cohortId).get()
    : await db.collection('participants').get();

  console.log(`\n참가자 분석:`);
  console.log(`  - 전체 참가자: ${participantsSnapshot.size}명`);

  // 어드민, 슈퍼어드민, 고스트 분류
  let superAdminCount = 0;
  let adminCount = 0;
  let ghostCount = 0;
  const excludedIds = new Set<string>();
  const nonSuperAdminParticipants: any[] = [];

  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    let isExcluded = false;

    if (data.isSuperAdmin === true) {
      superAdminCount++;
      excludedIds.add(doc.id);
      isExcluded = true;
    }
    if (data.isAdministrator === true) {
      adminCount++;
      excludedIds.add(doc.id);
      isExcluded = true;
    }
    if (data.isGhost === true) {
      ghostCount++;
      excludedIds.add(doc.id);
      isExcluded = true;
    }

    if (!isExcluded) {
      nonSuperAdminParticipants.push(doc);
    }
  });

  console.log(`  - 슈퍼어드민: ${superAdminCount}명`);
  console.log(`  - 어드민: ${adminCount}명`);
  console.log(`  - 고스트: ${ghostCount}명`);
  console.log(`  - 제외 대상 (합계): ${excludedIds.size}명`);
  console.log(`  - ✅ 대상 참가자: ${nonSuperAdminParticipants.length}명`);

  // 3. 독서 인증 조회
  const targetParticipantIds = nonSuperAdminParticipants.map(doc => doc.id);
  const allSubmissions: any[] = [];
  const todaySubmissions: any[] = [];

  if (targetParticipantIds.length > 0) {
    const chunkSize = 10;
    for (let i = 0; i < targetParticipantIds.length; i += chunkSize) {
      const chunk = targetParticipantIds.slice(i, i + chunkSize);

      // 전체 제출 (draft 제외)
      const submissionsChunk = await db
        .collection('reading_submissions')
        .where('participantId', 'in', chunk)
        .get();

      const nonDraftSubmissions = submissionsChunk.docs.filter(doc =>
        doc.data().status !== 'draft'
      );
      allSubmissions.push(...nonDraftSubmissions);

      // 오늘 제출 (draft 제외)
      const todayChunk = await db
        .collection('reading_submissions')
        .where('participantId', 'in', chunk)
        .where('submissionDate', '==', todayString)
        .get();

      const nonDraftTodaySubmissions = todayChunk.docs.filter(doc =>
        doc.data().status !== 'draft'
      );
      todaySubmissions.push(...nonDraftTodaySubmissions);
    }
  }

  // draft 상태 통계
  const allSubmissionsRaw = cohortId
    ? await db.collection('reading_submissions').get().then(async snap => {
        return {
          docs: snap.docs.filter(d => targetParticipantIds.includes(d.data().participantId))
        };
      })
    : await db.collection('reading_submissions').get().then(snap => ({
        docs: snap.docs.filter(d => targetParticipantIds.includes(d.data().participantId))
      }));

  const draftCount = allSubmissionsRaw.docs.filter(doc => doc.data().status === 'draft').length;

  console.log(`\n독서 인증 분석:`);
  console.log(`  - 전체 인증 (raw): ${allSubmissionsRaw.docs.length}개`);
  console.log(`  - draft 상태: ${draftCount}개`);
  console.log(`  - ✅ 전체 인증 (draft 제외): ${allSubmissions.length}개`);

  // 오늘 인증 (참가자 기준 중복 제거)
  const todayParticipantIds = new Set<string>();
  todaySubmissions.forEach((doc) => {
    todayParticipantIds.add(doc.data().participantId);
  });

  console.log(`  - 오늘 인증 문서 수: ${todaySubmissions.length}개`);
  console.log(`  - ✅ 오늘 인증 참가자 수: ${todayParticipantIds.size}명`);

  // 4. 푸시 알림 허용 인원
  const pushEnabledCount = nonSuperAdminParticipants.filter((doc) => {
    const data = doc.data();
    return hasAnyPushSubscription(data);
  }).length;

  console.log(`\n푸시 알림 분석:`);
  console.log(`  - ✅ 푸시 허용: ${pushEnabledCount}명`);

  // 5. 평균 독서 인증 계산
  const averageSubmissionsPerParticipant = nonSuperAdminParticipants.length > 0
    ? Math.round((allSubmissions.length / nonSuperAdminParticipants.length) * 10) / 10
    : 0;

  console.log(`\n평균 독서 인증 계산:`);
  console.log(`  - 전체 인증: ${allSubmissions.length}개`);
  console.log(`  - 대상 참가자: ${nonSuperAdminParticipants.length}명`);
  console.log(`  - ✅ 평균: ${averageSubmissionsPerParticipant}회/인`);

  // 6. 총 인증률 계산
  let totalSubmissionRate = 0;
  let maxPossibleSubmissions = 0;

  if (cohortId && elapsedDays > 0 && nonSuperAdminParticipants.length > 0) {
    maxPossibleSubmissions = nonSuperAdminParticipants.length * elapsedDays;
    totalSubmissionRate = Math.round((allSubmissions.length / maxPossibleSubmissions) * 100);
  } else if (!cohortId && nonSuperAdminParticipants.length > 0) {
    // 전체 보기 시
    const allCohortsSnapshot = await db.collection('cohorts').get();
    const cohortMap = new Map<string, { startDate: string; endDate: string }>();
    allCohortsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      cohortMap.set(doc.id, { startDate: data.startDate, endDate: data.endDate });
    });

    const today = new Date(todayString);
    let totalMax = 0;

    nonSuperAdminParticipants.forEach(participant => {
      const participantData = participant.data();
      const cohortInfo = cohortMap.get(participantData.cohortId);
      if (cohortInfo) {
        const startDate = new Date(cohortInfo.startDate);
        const endDate = new Date(cohortInfo.endDate);
        // 종료된 기수는 종료일까지만 계산
        const compareDate = today > endDate ? endDate : today;
        const daysDiff = Math.floor((compareDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const participantElapsedDays = Math.max(0, daysDiff - 1);
        totalMax += participantElapsedDays;
      }
    });

    maxPossibleSubmissions = totalMax;
    if (totalMax > 0) {
      totalSubmissionRate = Math.round((allSubmissions.length / totalMax) * 100);
    }
  }

  console.log(`\n총 인증률 계산:`);
  console.log(`  - 경과 일수: ${elapsedDays}일`);
  console.log(`  - 최대 가능 인증 수: ${maxPossibleSubmissions}개`);
  console.log(`  - 실제 인증 수: ${allSubmissions.length}개`);
  console.log(`  - ✅ 총 인증률: ${totalSubmissionRate}%`);

  // 최종 요약
  console.log('\n' + '='.repeat(80));
  console.log('📊 최종 검증 결과 요약');
  console.log('='.repeat(80));
  console.log(`| 항목                    | 값                |`);
  console.log(`|------------------------|-------------------|`);
  console.log(`| 평균 독서 인증          | ${averageSubmissionsPerParticipant}회/인          |`);
  console.log(`| 총 참가자              | ${nonSuperAdminParticipants.length}명              |`);
  console.log(`| 푸시 알림 허용          | ${pushEnabledCount}명              |`);
  console.log(`| 오늘 인증              | ${todayParticipantIds.size}명              |`);
  console.log(`| 전체 인증              | ${allSubmissions.length}개              |`);
  console.log(`| 총 인증률              | ${totalSubmissionRate}%              |`);
  console.log('='.repeat(80));
}

// 실행
const cohortId = process.argv[2];
verifyOverviewStats(cohortId)
  .then(() => {
    console.log('\n✅ 검증 완료\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 에러 발생:', error);
    process.exit(1);
  });
