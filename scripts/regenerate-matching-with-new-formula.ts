/**
 * 신규 공식으로 매칭 데이터 재생성
 *
 * 2025-11-10 데이터를 삭제하고 신규 공식 (2 × (n + 2))로 재생성
 *
 * 안전장치:
 * 1. 기존 데이터 백업 (matching_results_backup 컬렉션)
 * 2. 트랜잭션 사용
 * 3. 검증 로직
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

interface Participant {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  participationCode: string;
}

interface ParticipantWithSubmissionCount extends Participant {
  submissionCount: number;
}

// Fisher-Yates 셔플
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 성별별 그룹화
function groupByGender(participants: ParticipantWithSubmissionCount[]) {
  const male: ParticipantWithSubmissionCount[] = [];
  const female: ParticipantWithSubmissionCount[] = [];
  const other: ParticipantWithSubmissionCount[] = [];

  participants.forEach(p => {
    if (p.gender === 'male') {
      male.push(p);
    } else if (p.gender === 'female') {
      female.push(p);
    } else {
      other.push(p);
    }
  });

  return { male, female, other };
}

// 후보 필터링
function filterCandidates(
  providers: ParticipantWithSubmissionCount[],
  currentViewerId: string,
  recentlyAssignedIds: string[]
): ParticipantWithSubmissionCount[] {
  const recentSet = new Set(recentlyAssignedIds);
  return providers.filter(p =>
    p.id !== currentViewerId && !recentSet.has(p.id)
  );
}

// 성별 균형 랜덤 선택
function selectWithGenderBalance(
  candidates: ParticipantWithSubmissionCount[],
  count: number
): ParticipantWithSubmissionCount[] {
  if (candidates.length === 0 || count === 0) {
    return [];
  }

  const { male, female, other } = groupByGender(candidates);
  const shuffledMale = shuffleArray(male);
  const shuffledFemale = shuffleArray(female);
  const shuffledOther = shuffleArray(other);

  const selected: ParticipantWithSubmissionCount[] = [];
  const targetPerGender = Math.floor(count / 2);

  // 남성 선택
  const maleToSelect = Math.min(targetPerGender, shuffledMale.length);
  selected.push(...shuffledMale.slice(0, maleToSelect));

  // 여성 선택
  const femaleToSelect = Math.min(targetPerGender, shuffledFemale.length);
  selected.push(...shuffledFemale.slice(0, femaleToSelect));

  // 부족한 경우 나머지 채우기
  const remaining = count - selected.length;
  if (remaining > 0) {
    const remainingCandidates = [
      ...shuffledMale.slice(maleToSelect),
      ...shuffledFemale.slice(femaleToSelect),
      ...shuffledOther,
    ];
    const shuffledRemaining = shuffleArray(remainingCandidates);
    selected.push(...shuffledRemaining.slice(0, remaining));
  }

  return selected;
}

// 중복 제거
function dedupeParticipants(participants: ParticipantWithSubmissionCount[]): ParticipantWithSubmissionCount[] {
  const seen = new Set<string>();
  const deduped: ParticipantWithSubmissionCount[] = [];
  participants.forEach((participant) => {
    if (!seen.has(participant.id)) {
      seen.add(participant.id);
      deduped.push(participant);
    }
  });
  return deduped;
}

async function regenerateMatchingWithNewFormula() {
  try {
    const cohortId = '3';
    const targetDate = '2025-11-10';
    const previousDate = '2025-11-09';

    console.log(`🔄 ${targetDate} 매칭 데이터 재생성 시작\n`);

    // 1. 기존 데이터 백업
    console.log('=== 1단계: 기존 데이터 백업 ===\n');

    const cohortRef = db.collection('cohorts').doc(cohortId);
    const cohortDoc = await cohortRef.get();
    const cohortData = cohortDoc.data();

    if (!cohortData?.dailyFeaturedParticipants?.[targetDate]) {
      console.log('❌ 재생성할 데이터가 없습니다.');
      return;
    }

    const oldData = cohortData.dailyFeaturedParticipants[targetDate];
    console.log('📦 백업 중...');
    console.log(`   기존 assignments: ${Object.keys(oldData.assignments || {}).length}명`);

    // matching_results_backup 컬렉션에 백업
    await db.collection('matching_results_backup').doc(`${cohortId}-${targetDate}`).set({
      cohortId,
      date: targetDate,
      backupTimestamp: FieldValue.serverTimestamp(),
      oldFormula: '2 × (n + 1)',
      data: oldData,
    });

    console.log('✅ 백업 완료 (matching_results_backup 컬렉션)\n');

    // 2. 참가자 정보 조회
    console.log('=== 2단계: 참가자 정보 조회 ===\n');

    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortId)
      .get();

    const allParticipants: Participant[] = participantsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || doc.id,
      gender: doc.data().gender,
      participationCode: doc.data().participationCode || doc.id,
    }));

    console.log(`총 참가자: ${allParticipants.length}명\n`);

    // 3. 어제(2025-11-09) 인증한 사람들 조회 (공급자)
    console.log('=== 3단계: 공급자(어제 인증자) 조회 ===\n');

    const submissionsSnapshot = await db
      .collection('reading_submissions')
      .where('cohortId', '==', cohortId)
      .where('submissionDate', '==', previousDate)
      .where('status', '==', 'approved')
      .get();

    const providerIds = new Set(submissionsSnapshot.docs.map(doc => doc.data().participantId));
    const providers = allParticipants.filter(p => providerIds.has(p.id));

    console.log(`어제(${previousDate}) 인증자: ${providers.length}명\n`);

    // 4. 각 참가자의 누적 인증 횟수 계산 (2025-11-09 기준)
    console.log('=== 4단계: 누적 인증 횟수 계산 ===\n');

    const allSubmissionsSnapshot = await db
      .collection('reading_submissions')
      .where('cohortId', '==', cohortId)
      .where('status', '==', 'approved')
      .get();

    // 참가자별 누적 인증 횟수 (2025-11-09 이전 데이터만)
    const submissionCountMap = new Map<string, number>();

    allParticipants.forEach(p => {
      const participationCode = p.participationCode || p.id;
      const submissions = allSubmissionsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return (
          data.participationCode === participationCode &&
          data.submissionDate &&
          data.submissionDate < targetDate // 2025-11-10 이전
        );
      });

      const uniqueDates = new Set(submissions.map(doc => doc.data().submissionDate));
      submissionCountMap.set(p.id, uniqueDates.size);
    });

    console.log('누적 인증 분포:');
    const countDistribution = new Map<number, number>();
    submissionCountMap.forEach((count) => {
      countDistribution.set(count, (countDistribution.get(count) || 0) + 1);
    });
    Array.from(countDistribution.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([count, freq]) => {
        console.log(`   ${count}회: ${freq}명`);
      });
    console.log('');

    // 5. 신규 공식으로 매칭 실행
    console.log('=== 5단계: 신규 공식으로 매칭 실행 ===\n');
    console.log('신규 공식: 2 × (submissionCount + 2)\n');

    const providersWithCount: ParticipantWithSubmissionCount[] = providers.map(p => ({
      ...p,
      submissionCount: submissionCountMap.get(p.id) || 0,
    }));

    const viewersWithCount: ParticipantWithSubmissionCount[] = allParticipants.map(p => ({
      ...p,
      submissionCount: submissionCountMap.get(p.id) || 0,
    }));

    const assignments: Record<string, { assigned: string[] }> = {};

    for (const viewer of viewersWithCount) {
      const { id, name, submissionCount } = viewer;

      // 신규 공식: 2 × (submissionCount + 2)
      const profileBookCount = 2 * (submissionCount + 2);

      // 후보 필터링 (본인 제외, 최근 3일 중복 제외 - 여기서는 단순화)
      const primaryCandidates = filterCandidates(providersWithCount, id, []);

      let candidates = primaryCandidates;

      // Fallback: 공급자가 부족하면 전체 참가자로 확장
      if (candidates.length < profileBookCount) {
        const fallbackPool = dedupeParticipants([
          ...candidates,
          ...filterCandidates(viewersWithCount, id, []),
        ]);
        candidates = fallbackPool;
      }

      // 성별 균형 우선 랜덤 선택
      const selected = selectWithGenderBalance(candidates, profileBookCount);

      assignments[id] = {
        assigned: selected.map(p => p.id),
      };

      console.log(`${name}: ${selected.length}개 할당 (목표: ${profileBookCount}개, 누적: ${submissionCount}회)`);
    }

    console.log('');

    // 6. 검증
    console.log('=== 6단계: 할당 검증 ===\n');

    let errorCount = 0;
    const newCounts: number[] = [];

    Object.entries(assignments).forEach(([id, assignment]) => {
      const count = assignment.assigned.length;
      newCounts.push(count);

      // 본인 제외 확인
      if (assignment.assigned.includes(id)) {
        console.log(`❌ ${id}: 본인이 할당되어 있음`);
        errorCount++;
      }

      // 중복 확인
      const uniqueIds = new Set(assignment.assigned);
      if (uniqueIds.size !== count) {
        console.log(`❌ ${id}: 중복된 프로필북 ID 발견`);
        errorCount++;
      }
    });

    if (errorCount > 0) {
      console.log(`\n❌ 검증 실패: ${errorCount}개 에러 발견`);
      console.log('재생성을 중단합니다.\n');
      return;
    }

    console.log('✅ 검증 통과\n');

    // 7. 할당 통계
    console.log('=== 7단계: 새 할당 통계 ===\n');

    const distribution = new Map<number, number>();
    newCounts.forEach(count => {
      distribution.set(count, (distribution.get(count) || 0) + 1);
    });

    console.log('할당 개수 분포:');
    Array.from(distribution.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([count, freq]) => {
        console.log(`   ${count}개: ${freq}명`);
      });
    console.log('');

    // 8. DB 업데이트
    console.log('=== 8단계: DB 업데이트 ===\n');

    await db.runTransaction(async (transaction) => {
      // dailyFeaturedParticipants 업데이트
      transaction.update(cohortRef, {
        [`dailyFeaturedParticipants.${targetDate}`]: {
          assignments,
          matchingVersion: 'random',
          timestamp: FieldValue.serverTimestamp(),
          formula: '2 × (n + 2)', // 신규 공식 표시
        },
      });

      // matching_results 업데이트
      const matchingResultRef = db.collection('matching_results').doc(`${cohortId}-${targetDate}`);
      transaction.set(matchingResultRef, {
        cohortId,
        date: targetDate,
        assignments,
        matchingVersion: 'random',
        timestamp: FieldValue.serverTimestamp(),
        formula: '2 × (n + 2)',
      });
    });

    console.log('✅ DB 업데이트 완료\n');

    // 9. 최종 요약
    console.log('=== 9단계: 재생성 완료 ===\n');

    const oldCounts = Object.values(oldData.assignments || {}).map((a: any) =>
      (a.assigned || []).length
    );
    const oldMin = Math.min(...oldCounts);
    const oldMax = Math.max(...oldCounts);
    const oldAvg = oldCounts.reduce((sum, c) => sum + c, 0) / oldCounts.length;

    const newMin = Math.min(...newCounts);
    const newMax = Math.max(...newCounts);
    const newAvg = newCounts.reduce((sum, c) => sum + c, 0) / newCounts.length;

    console.log('📊 변경 전 (기존 공식):');
    console.log(`   범위: ${oldMin}~${oldMax}개`);
    console.log(`   평균: ${oldAvg.toFixed(1)}개`);
    console.log('');
    console.log('📊 변경 후 (신규 공식):');
    console.log(`   범위: ${newMin}~${newMax}개`);
    console.log(`   평균: ${newAvg.toFixed(1)}개`);
    console.log('');
    console.log(`✅ 평균 ${(newAvg - oldAvg).toFixed(1)}개 증가`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
regenerateMatchingWithNewFormula()
  .then(() => {
    console.log('\n✅ 재생성 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 재생성 실패:', error);
    process.exit(1);
  });
