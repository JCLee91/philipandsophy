/**
 * 클로징 파티 조 편성 알고리즘
 *
 * 클러스터 매칭 히스토리 기반으로 참가자들을 조로 편성
 * - 같은 클러스터에 많이 배정된 사람들끼리 묶기
 * - 한 조당 6명 (5~7명 허용)
 * - 인증 횟수 기반 Tier 분류
 *
 * @version 1.0.0
 * @date 2025-12-05
 */

import * as admin from 'firebase-admin';
import { logger } from '../logger';

// Types
interface Participant {
  id: string;
  name: string;
  cohortId: string;
  isAdministrator?: boolean;
  isSuperAdmin?: boolean;
  isGhost?: boolean;
}

interface DailyMatchingEntry {
  assignments?: Record<string, { clusterId?: string; assigned?: string[] }>;
  clusters?: Record<string, { id: string; memberIds: string[] }>;
  matchingVersion?: string;
}

interface Cohort {
  id: string;
  name: string;
  dailyFeaturedParticipants?: Record<string, DailyMatchingEntry>;
}

export interface ClosingPartyGroup {
  groupId: string;
  groupNumber: number;
  memberIds: string[];
  memberNames: string[];
  tier: 'active' | 'moderate' | 'inactive' | 'mixed';
  averageAffinity: number;
}

type Tier = 'active' | 'moderate' | 'inactive';

// Affinity Matrix: participantId -> participantId -> count
type AffinityMatrix = Map<string, Map<string, number>>;

/**
 * 클로징 파티 조 편성 메인 함수
 */
export async function formClosingPartyGroups(
  db: admin.firestore.Firestore,
  cohortId: string,
  targetGroupSize: number = 6
): Promise<ClosingPartyGroup[]> {
  logger.info(`Forming closing party groups for cohort: ${cohortId}`);

  // 1. 코호트 정보 조회
  const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
  if (!cohortDoc.exists) {
    throw new Error(`Cohort ${cohortId} not found`);
  }
  const cohort = { id: cohortDoc.id, ...cohortDoc.data() } as Cohort;

  // 2. 참가자 목록 조회 (관리자/고스트 제외)
  const participantsSnapshot = await db
    .collection('participants')
    .where('cohortId', '==', cohortId)
    .get();

  const participants = participantsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Participant))
    .filter((p) => !p.isAdministrator && !p.isSuperAdmin && !p.isGhost);

  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const allParticipantIds = Array.from(participantMap.keys());

  logger.info(`Found ${participants.length} eligible participants`);

  // 3. 클러스터 데이터 확인
  const dailyFeaturedParticipants = cohort.dailyFeaturedParticipants || {};
  const hasClusterData = Object.values(dailyFeaturedParticipants).some(
    (entry) => entry.matchingVersion === 'cluster' && entry.clusters
  );

  let groups: ClosingPartyGroup[];

  if (hasClusterData) {
    // 클러스터 데이터 있음: 친밀도 기반 편성
    logger.info('Using affinity-based group formation (cluster data available)');
    groups = formGroupsWithAffinity(
      dailyFeaturedParticipants,
      allParticipantIds,
      participantMap,
      targetGroupSize
    );
  } else {
    // 클러스터 데이터 없음: 랜덤 편성
    logger.info('Using random group formation (no cluster data)');
    groups = formGroupsRandomly(allParticipantIds, participantMap, targetGroupSize);
  }

  logger.info(`Formed ${groups.length} groups`);
  return groups;
}

/**
 * 친밀도 기반 조 편성
 */
function formGroupsWithAffinity(
  dailyFeaturedParticipants: Record<string, DailyMatchingEntry>,
  allParticipantIds: string[],
  participantMap: Map<string, Participant>,
  targetGroupSize: number
): ClosingPartyGroup[] {
  // 1. 친밀도 행렬 구축
  const { matrix, submissionCounts } = buildAffinityMatrix(
    dailyFeaturedParticipants,
    allParticipantIds
  );

  // 2. Tier 분류
  const clusterDays = Object.values(dailyFeaturedParticipants).filter(
    (entry) => entry.matchingVersion === 'cluster'
  ).length;
  const tiers = classifyTiers(submissionCounts, clusterDays);

  // 3. Tier별 참가자 분류
  const tierGroups: Record<Tier, string[]> = {
    active: [],
    moderate: [],
    inactive: [],
  };

  for (const pid of allParticipantIds) {
    const tier = tiers.get(pid) || 'inactive';
    tierGroups[tier].push(pid);
  }

  logger.info(
    `Tier distribution - Active: ${tierGroups.active.length}, Moderate: ${tierGroups.moderate.length}, Inactive: ${tierGroups.inactive.length}`
  );

  // 4. Greedy 그룹핑
  const groups: ClosingPartyGroup[] = [];
  const assigned = new Set<string>();
  let groupNumber = 1;

  // 각 tier별 처리
  for (const tier of ['active', 'moderate', 'inactive'] as Tier[]) {
    const candidates = tierGroups[tier].filter((p) => !assigned.has(p));

    while (candidates.length >= targetGroupSize - 1) {
      // 5명 이상 남아있으면 조 생성
      const group = formSingleGroupGreedy(
        candidates,
        matrix,
        participantMap,
        targetGroupSize,
        tier,
        groupNumber++
      );

      if (group.memberIds.length > 0) {
        groups.push(group);
        for (const pid of group.memberIds) {
          assigned.add(pid);
          const idx = candidates.indexOf(pid);
          if (idx > -1) candidates.splice(idx, 1);
        }
      } else {
        break;
      }
    }
  }

  // 5. 잔여 인원 처리
  const remaining = allParticipantIds.filter((p) => !assigned.has(p));
  if (remaining.length > 0) {
    handleRemainingParticipants(
      groups,
      remaining,
      matrix,
      participantMap,
      targetGroupSize,
      groupNumber
    );
  }

  return groups;
}

/**
 * 친밀도 행렬 구축
 */
function buildAffinityMatrix(
  dailyFeaturedParticipants: Record<string, DailyMatchingEntry>,
  allParticipantIds: string[]
): {
  matrix: AffinityMatrix;
  submissionCounts: Map<string, number>;
} {
  const matrix: AffinityMatrix = new Map();
  const submissionCounts = new Map<string, number>();

  // 모든 참가자 초기화
  for (const pid of allParticipantIds) {
    matrix.set(pid, new Map());
    submissionCounts.set(pid, 0);
  }

  // 각 날짜별 클러스터 데이터 순회
  for (const [, entry] of Object.entries(dailyFeaturedParticipants)) {
    if (entry.matchingVersion !== 'cluster') continue;
    if (!entry.clusters) continue;

    // 각 클러스터 내 멤버들 간의 친밀도 증가
    for (const cluster of Object.values(entry.clusters)) {
      const members = cluster.memberIds.filter((id) => allParticipantIds.includes(id));

      // 인증 횟수 증가
      for (const memberId of members) {
        const count = submissionCounts.get(memberId) || 0;
        submissionCounts.set(memberId, count + 1);
      }

      // 클러스터 내 모든 쌍에 대해 친밀도 +1
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const a = members[i];
          const b = members[j];

          // a -> b
          const aMap = matrix.get(a);
          if (aMap) {
            aMap.set(b, (aMap.get(b) || 0) + 1);
          }

          // b -> a (대칭)
          const bMap = matrix.get(b);
          if (bMap) {
            bMap.set(a, (bMap.get(a) || 0) + 1);
          }
        }
      }
    }
  }

  return { matrix, submissionCounts };
}

/**
 * Tier 분류 (인증 횟수 기반)
 */
function classifyTiers(
  submissionCounts: Map<string, number>,
  totalDays: number
): Map<string, Tier> {
  const tiers = new Map<string, Tier>();

  if (totalDays === 0) {
    // 클러스터 데이터가 없으면 모두 inactive
    for (const [pid] of submissionCounts) {
      tiers.set(pid, 'inactive');
    }
    return tiers;
  }

  for (const [pid, count] of submissionCounts) {
    const ratio = count / totalDays;

    if (ratio >= 0.7) {
      tiers.set(pid, 'active');
    } else if (ratio >= 0.3) {
      tiers.set(pid, 'moderate');
    } else {
      tiers.set(pid, 'inactive');
    }
  }

  return tiers;
}

/**
 * Greedy 방식으로 단일 그룹 생성
 */
function formSingleGroupGreedy(
  candidates: string[],
  matrix: AffinityMatrix,
  participantMap: Map<string, Participant>,
  targetSize: number,
  tier: Tier,
  groupNumber: number
): ClosingPartyGroup {
  if (candidates.length === 0) {
    return {
      groupId: '',
      groupNumber,
      memberIds: [],
      memberNames: [],
      tier,
      averageAffinity: 0,
    };
  }

  // 1. 시드 선택: 가장 많은 친밀도 합을 가진 참가자
  let seed = candidates[0];
  let maxTotalAffinity = 0;

  for (const pid of candidates) {
    const affinities = matrix.get(pid);
    let total = 0;
    for (const other of candidates) {
      if (other !== pid) {
        total += affinities?.get(other) || 0;
      }
    }
    if (total > maxTotalAffinity) {
      maxTotalAffinity = total;
      seed = pid;
    }
  }

  const group: string[] = [seed];
  const remaining = candidates.filter((p) => p !== seed);

  // 2. Greedy하게 가장 친밀도가 높은 사람 추가
  while (group.length < targetSize && remaining.length > 0) {
    let bestCandidate = remaining[0];
    let bestScore = -1;

    for (const candidate of remaining) {
      let score = 0;
      for (const member of group) {
        score += matrix.get(member)?.get(candidate) || 0;
      }

      if (score > bestScore || (score === bestScore && candidate < bestCandidate)) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    group.push(bestCandidate);
    remaining.splice(remaining.indexOf(bestCandidate), 1);
  }

  // 평균 친밀도 계산
  const averageAffinity = calculateAverageAffinity(group, matrix);

  // 이름 매핑
  const memberNames = group.map((id) => participantMap.get(id)?.name || 'Unknown');

  return {
    groupId: `group-${groupNumber}`,
    groupNumber,
    memberIds: group,
    memberNames,
    tier,
    averageAffinity,
  };
}

/**
 * 잔여 인원 처리
 */
function handleRemainingParticipants(
  groups: ClosingPartyGroup[],
  remaining: string[],
  matrix: AffinityMatrix,
  participantMap: Map<string, Participant>,
  targetSize: number,
  nextGroupNumber: number
): void {
  // 5명 이상이면 새 조 생성
  if (remaining.length >= 5) {
    const memberNames = remaining.map((id) => participantMap.get(id)?.name || 'Unknown');
    const averageAffinity = calculateAverageAffinity(remaining, matrix);

    groups.push({
      groupId: `group-${nextGroupNumber}`,
      groupNumber: nextGroupNumber,
      memberIds: remaining,
      memberNames,
      tier: 'mixed',
      averageAffinity,
    });
    return;
  }

  // 4명 이하면 기존 조에 분배 (7명까지 허용)
  // ✅ FIX: groups가 비어있으면 새 조 생성 (edge case: 총 참가자 4명 이하)
  if (groups.length === 0) {
    const memberNames = remaining.map((id) => participantMap.get(id)?.name || 'Unknown');
    const averageAffinity = calculateAverageAffinity(remaining, matrix);

    groups.push({
      groupId: `group-${nextGroupNumber}`,
      groupNumber: nextGroupNumber,
      memberIds: remaining,
      memberNames,
      tier: 'mixed',
      averageAffinity,
    });
    return;
  }

  for (const pid of remaining) {
    let bestGroup = groups[0];
    let bestScore = -1;

    for (const group of groups) {
      if (group.memberIds.length >= 7) continue; // 7명 초과 방지

      let score = 0;
      for (const member of group.memberIds) {
        score += matrix.get(pid)?.get(member) || 0;
      }

      // 동점시 인원 적은 조 우선
      if (
        score > bestScore ||
        (score === bestScore && group.memberIds.length < bestGroup.memberIds.length)
      ) {
        bestScore = score;
        bestGroup = group;
      }
    }

    const name = participantMap.get(pid)?.name || 'Unknown';
    bestGroup.memberIds.push(pid);
    bestGroup.memberNames.push(name);
    bestGroup.averageAffinity = calculateAverageAffinity(bestGroup.memberIds, matrix);

    if (bestGroup.tier !== 'mixed') {
      bestGroup.tier = 'mixed';
    }
  }
}

/**
 * 평균 친밀도 계산
 */
function calculateAverageAffinity(members: string[], matrix: AffinityMatrix): number {
  if (members.length < 2) return 0;

  let totalAffinity = 0;
  let pairs = 0;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      totalAffinity += matrix.get(members[i])?.get(members[j]) || 0;
      pairs++;
    }
  }

  return pairs > 0 ? Math.round((totalAffinity / pairs) * 100) / 100 : 0;
}

/**
 * 랜덤 조 편성 (클러스터 데이터 없는 경우)
 */
function formGroupsRandomly(
  allParticipantIds: string[],
  participantMap: Map<string, Participant>,
  targetGroupSize: number
): ClosingPartyGroup[] {
  // 셔플
  const shuffled = [...allParticipantIds].sort(() => Math.random() - 0.5);
  const groups: ClosingPartyGroup[] = [];

  let groupNumber = 1;
  for (let i = 0; i < shuffled.length; i += targetGroupSize) {
    const memberIds = shuffled.slice(i, Math.min(i + targetGroupSize, shuffled.length));

    // 마지막 조가 너무 작으면 이전 조에 분배
    if (memberIds.length < 4 && groups.length > 0) {
      for (const pid of memberIds) {
        // 가장 작은 조에 추가
        const smallestGroup = groups.reduce((min, g) =>
          g.memberIds.length < min.memberIds.length ? g : min
        );
        smallestGroup.memberIds.push(pid);
        smallestGroup.memberNames.push(participantMap.get(pid)?.name || 'Unknown');
      }
    } else {
      const memberNames = memberIds.map((id) => participantMap.get(id)?.name || 'Unknown');

      groups.push({
        groupId: `group-${groupNumber}`,
        groupNumber: groupNumber++,
        memberIds,
        memberNames,
        tier: 'mixed',
        averageAffinity: 0, // 랜덤이므로 친밀도 0
      });
    }
  }

  return groups;
}

/**
 * 수동 조정: 참가자를 다른 조로 이동
 */
export function moveParticipantBetweenGroups(
  groups: ClosingPartyGroup[],
  participantId: string,
  fromGroupId: string,
  toGroupId: string,
  participantMap: Map<string, Participant>
): ClosingPartyGroup[] {
  const fromGroup = groups.find((g) => g.groupId === fromGroupId);
  const toGroup = groups.find((g) => g.groupId === toGroupId);

  if (!fromGroup || !toGroup) {
    throw new Error('Group not found');
  }

  const idx = fromGroup.memberIds.indexOf(participantId);
  if (idx === -1) {
    throw new Error('Participant not in source group');
  }

  // 이동
  fromGroup.memberIds.splice(idx, 1);
  fromGroup.memberNames.splice(idx, 1);

  const name = participantMap.get(participantId)?.name || 'Unknown';
  toGroup.memberIds.push(participantId);
  toGroup.memberNames.push(name);

  // Tier 업데이트
  if (fromGroup.memberIds.length > 0) {
    fromGroup.tier = 'mixed';
  }
  toGroup.tier = 'mixed';

  return groups;
}
