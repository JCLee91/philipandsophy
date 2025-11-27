#!/usr/bin/env tsx
/**
 * 코호트 상세 페이지 데이터 검증 스크립트
 */

import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';

async function verifyCohortDetail(cohortId: string) {
  const { db } = getFirebaseAdmin();

  console.log('\n📊 코호트 상세 페이지 데이터 검증\n');
  console.log('='.repeat(80));

  // 코호트 정보 조회
  const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
  if (!cohortDoc.exists) {
    console.log('코호트를 찾을 수 없습니다');
    return;
  }

  const cohortData = cohortDoc.data();
  console.log(`코호트: ${cohortData.name}`);
  console.log(`시작일: ${cohortData.startDate}`);
  console.log(`종료일: ${cohortData.endDate}`);

  // 참가자 조회
  const participantsSnapshot = await db.collection('participants')
    .where('cohortId', '==', cohortId)
    .get();

  console.log(`\n전체 참가자 수 (DB): ${participantsSnapshot.size}명`);

  // 분류
  let superAdminCount = 0;
  let adminCount = 0;
  let ghostCount = 0;
  const nonAdminParticipants: any[] = [];

  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.isSuperAdmin) superAdminCount++;
    if (data.isAdministrator) adminCount++;
    if (data.isGhost) ghostCount++;

    if (!data.isSuperAdmin && !data.isAdministrator && !data.isGhost) {
      nonAdminParticipants.push({ id: doc.id, ...data });
    }
  });

  console.log(`  - 슈퍼어드민: ${superAdminCount}명`);
  console.log(`  - 어드민: ${adminCount}명`);
  console.log(`  - 고스트: ${ghostCount}명`);
  console.log(`  - ✅ 표시 대상 참가자: ${nonAdminParticipants.length}명`);

  // 각 참가자별 인증 횟수 조회
  let totalSubmissions = 0;
  const participantStats: { name: string; count: number }[] = [];

  for (const p of nonAdminParticipants) {
    const submissionsSnapshot = await db.collection('reading_submissions')
      .where('participantId', '==', p.id)
      .get();

    // draft 제외
    const validCount = submissionsSnapshot.docs.filter(doc => doc.data().status !== 'draft').length;
    totalSubmissions += validCount;
    participantStats.push({ name: p.name, count: validCount });
  }

  // 정렬 (인증 많은 순)
  participantStats.sort((a, b) => b.count - a.count);

  console.log(`\n총 인증 수 (draft 제외): ${totalSubmissions}회`);
  console.log(`1인당 평균 인증: ${nonAdminParticipants.length > 0 ? Math.round((totalSubmissions / nonAdminParticipants.length) * 10) / 10 : 0}회`);

  console.log('\n참가자별 인증 현황 (상위 10명):');
  console.log('-'.repeat(40));
  participantStats.slice(0, 10).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name}: ${p.count}회`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('📊 UI에 표시되어야 할 값');
  console.log('='.repeat(80));
  console.log(`| 항목            | 값          |`);
  console.log(`|----------------|------------|`);
  console.log(`| 참가자 수       | ${nonAdminParticipants.length}명       |`);
  console.log(`| 총 인증 수      | ${totalSubmissions}회       |`);
  console.log(`| 평균 인증률     | ${nonAdminParticipants.length > 0 ? Math.round((totalSubmissions / nonAdminParticipants.length) * 10) / 10 : 0}회       |`);
  console.log('='.repeat(80));
}

const cohortId = process.argv[2] || '3';
verifyCohortDetail(cohortId)
  .then(() => {
    console.log('\n✅ 검증 완료\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 에러:', error);
    process.exit(1);
  });
