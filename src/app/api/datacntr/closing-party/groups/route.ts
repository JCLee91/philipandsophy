import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import type {
  Cohort,
  Participant,
  ClosingPartyStats,
  ClosingPartyGroup,
  ClosingPartyGroupMember,
} from '@/types/database';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

// Types
interface DailyMatchingEntry {
  assignments?: Record<string, { clusterId?: string; assigned?: string[] }>;
  clusters?: Record<string, { id: string; memberIds: string[] }>;
  matchingVersion?: string;
}

type Tier = 'active' | 'moderate' | 'inactive' | 'mixed';
type AffinityMatrix = Map<string, Map<string, number>>;

// 인원 제한 상수
const GROUP_SIZE = {
  MIN: 4,
  MAX: 6,
} as const;

// 성비 균형 상수
const GENDER_BALANCE = {
  MAX_RATIO: 2 / 3, // 한 성별 최대 비율
} as const;

// 성별 카운트 타입
interface GenderCount {
  male: number;
  female: number;
  other: number;
  unknown: number;
}

interface ParticipantInfo {
  id: string;
  name: string;
  profileImageCircle?: string;
  gender?: 'male' | 'female' | 'other';
}

/**
 * GET /api/datacntr/closing-party/groups
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireWebAppAdmin(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohortId');

    if (!cohortId) {
      return NextResponse.json({ error: 'cohortId가 필요합니다' }, { status: 400 });
    }

    const db = getAdminDb();

    const statsDoc = await db.collection(COLLECTIONS.CLOSING_PARTY_STATS).doc(cohortId).get();

    if (!statsDoc.exists) {
      return NextResponse.json({
        groups: null,
        hasClusterData: false,
        message: '통계가 아직 계산되지 않았습니다.',
      });
    }

    const stats = statsDoc.data() as ClosingPartyStats;

    const cohortDoc = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();
    const cohort = cohortDoc.data() as Cohort;
    const dailyFeaturedParticipants = (cohort?.dailyFeaturedParticipants || {}) as Record<
      string,
      DailyMatchingEntry
    >;
    const hasClusterData = Object.values(dailyFeaturedParticipants).some(
      (entry) => entry.matchingVersion === 'cluster' && entry.clusters
    );

    // 이전 데이터 구조 호환성 처리 (memberIds/memberNames → members)
    let groups = stats.groups || null;
    if (groups) {
      groups = groups.map((group: any) => {
        // 이미 새 구조면 그대로 반환
        if (group.members && Array.isArray(group.members)) {
          return group;
        }
        // 이전 구조면 변환
        if (group.memberIds && group.memberNames) {
          return {
            ...group,
            members: group.memberIds.map((id: string, idx: number) => ({
              participantId: id,
              name: group.memberNames[idx] || 'Unknown',
              submissionCount: 0,
            })),
          };
        }
        // 빈 members 배열로 초기화
        return { ...group, members: [] };
      });
    }

    return NextResponse.json({
      groups,
      groupFormationAt: stats.groupFormationAt || null,
      hasClusterData,
      totalParticipants: stats.totalParticipants,
    });
  } catch (error) {
    logger.error('조 편성 조회 실패:', error);
    return NextResponse.json({ error: '조 편성 조회 중 오류가 발생했습니다' }, { status: 500 });
  }
}

/**
 * POST /api/datacntr/closing-party/groups
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireWebAppAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { cohortId, targetGroupSize = 6 } = body;
    const normalizedTargetGroupSize = Math.min(
      Math.max(targetGroupSize, GROUP_SIZE.MIN),
      GROUP_SIZE.MAX
    );

    if (!cohortId) {
      return NextResponse.json({ error: 'cohortId가 필요합니다' }, { status: 400 });
    }

    const db = getAdminDb();

    // 1. 코호트 정보 조회
    const cohortDoc = await db.collection(COLLECTIONS.COHORTS).doc(cohortId).get();
    if (!cohortDoc.exists) {
      return NextResponse.json({ error: '코호트를 찾을 수 없습니다' }, { status: 404 });
    }
    const cohort = { id: cohortDoc.id, ...cohortDoc.data() } as Cohort;

    // 2. 참가자 목록 조회 (관리자/고스트 제외)
    const participantsSnapshot = await db
      .collection(COLLECTIONS.PARTICIPANTS)
      .where('cohortId', '==', cohortId)
      .get();

    const participants = participantsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Participant))
      .filter((p) => !p.isAdministrator && !p.isSuperAdmin && !p.isGhost);

    const participantInfoMap = new Map<string, ParticipantInfo>(
      participants.map((p) => [
        p.id,
        { id: p.id, name: p.name, profileImageCircle: p.profileImageCircle, gender: p.gender },
      ])
    );
    const allParticipantIds: string[] = Array.from(participantInfoMap.keys());

    // 3. 기존 불참조 보존
    const statsDoc = await db.collection(COLLECTIONS.CLOSING_PARTY_STATS).doc(cohortId).get();
    const existingStats = statsDoc.exists ? (statsDoc.data() as ClosingPartyStats) : null;
    const existingAbsentGroup = existingStats?.groups?.find((g) => g.groupId === 'absent');
    const absentMemberIds = new Set(existingAbsentGroup?.members.map((m) => m.participantId) || []);

    // 불참자 제외한 참가자만 그룹핑
    const activeParticipantIds = allParticipantIds.filter((id) => !absentMemberIds.has(id));

    logger.info(
      `Forming groups for ${activeParticipantIds.length} participants (${absentMemberIds.size} absent)`
    );

    // 4. 실제 인증 횟수 조회
    const actualSubmissionCounts = new Map<string, number>();
    for (const pid of allParticipantIds) {
      actualSubmissionCounts.set(pid, 0);
    }

    // Firestore 'in' 쿼리는 30개 제한
    for (let i = 0; i < allParticipantIds.length; i += 30) {
      const chunk = allParticipantIds.slice(i, i + 30);
      const snapshot = await db
        .collection(COLLECTIONS.READING_SUBMISSIONS)
        .where('participantId', 'in', chunk)
        .where('status', '==', 'approved')
        .get();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const pid = data.participantId;
        if (pid) {
          actualSubmissionCounts.set(pid, (actualSubmissionCounts.get(pid) || 0) + 1);
        }
      });
    }

    // 4. 클러스터 데이터 확인
    const dailyFeaturedParticipants = (cohort.dailyFeaturedParticipants || {}) as Record<
      string,
      DailyMatchingEntry
    >;
    const hasClusterData = Object.values(dailyFeaturedParticipants).some(
      (entry) => entry.matchingVersion === 'cluster' && entry.clusters
    );

    // 6. 친밀도 행렬 구축 (클러스터 데이터 있든 없든 구축)
    const { matrix, clusterCounts } = buildAffinityMatrix(
      dailyFeaturedParticipants,
      activeParticipantIds
    );

    // 7. 조 편성 (불참자 제외)
    const groups = formGroups(
      activeParticipantIds,
      matrix,
      clusterCounts,
      actualSubmissionCounts,
      participantInfoMap,
      normalizedTargetGroupSize,
      hasClusterData
    );

    // 8. 불참조 추가 (기존 불참자가 있는 경우)
    if (existingAbsentGroup && existingAbsentGroup.members.length > 0) {
      groups.push(existingAbsentGroup);
    }

    // 9. 저장
    await db.collection(COLLECTIONS.CLOSING_PARTY_STATS).doc(cohortId).update({
      groups,
      groupFormationAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      groups,
      hasClusterData,
      message: hasClusterData
        ? '친밀도 기반으로 조가 편성되었습니다.'
        : '친밀도 데이터가 없어 기본 규칙으로 조가 편성되었습니다.',
    });
  } catch (error) {
    logger.error('조 편성 실패:', error);
    return NextResponse.json({ error: '조 편성 중 오류가 발생했습니다' }, { status: 500 });
  }
}

/**
 * PUT /api/datacntr/closing-party/groups
 * 조원 이동
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireWebAppAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { cohortId, participantId, fromGroupId, toGroupId } = body;

    if (!cohortId || !participantId || !fromGroupId || !toGroupId) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다' }, { status: 400 });
    }

    const db = getAdminDb();

    const statsDoc = await db.collection(COLLECTIONS.CLOSING_PARTY_STATS).doc(cohortId).get();
    if (!statsDoc.exists) {
      return NextResponse.json({ error: '통계를 찾을 수 없습니다' }, { status: 404 });
    }

    const stats = statsDoc.data() as ClosingPartyStats;
    if (!stats.groups) {
      return NextResponse.json({ error: '조 편성이 아직 되지 않았습니다' }, { status: 400 });
    }

    const groups = [...stats.groups];
    const fromGroup = groups.find((g) => g.groupId === fromGroupId);
    let toGroup = groups.find((g) => g.groupId === toGroupId);

    // 불참조가 없으면 생성
    if (toGroupId === 'absent' && !toGroup) {
      toGroup = {
        groupId: 'absent',
        groupNumber: 0,
        members: [],
        tier: 'inactive',
        averageAffinity: 0,
      };
      groups.push(toGroup);
    }

    if (!fromGroup || !toGroup) {
      return NextResponse.json({ error: '그룹을 찾을 수 없습니다' }, { status: 404 });
    }

    const memberIdx = fromGroup.members.findIndex((m) => m.participantId === participantId);
    if (memberIdx === -1) {
      return NextResponse.json({ error: '참가자가 해당 그룹에 없습니다' }, { status: 400 });
    }

    // 이동
    const [member] = fromGroup.members.splice(memberIdx, 1);
    toGroup.members.push(member);

    // Tier 업데이트 (불참조는 제외)
    if (fromGroup.groupId !== 'absent') {
      fromGroup.tier = 'mixed';
    }
    if (toGroup.groupId !== 'absent') {
      toGroup.tier = 'mixed';
    }

    // 빈 그룹 제거 (불참조 제외)
    const filteredGroups = groups.filter(
      (g) => g.groupId === 'absent' || g.members.length > 0
    );

    await db.collection(COLLECTIONS.CLOSING_PARTY_STATS).doc(cohortId).update({
      groups: filteredGroups,
      groupFormationAt: Timestamp.now(),
    });

    const targetName = toGroupId === 'absent' ? '불참조' : `${toGroup.groupNumber}조`;
    return NextResponse.json({
      success: true,
      groups: filteredGroups,
      message: `${member.name}님을 ${targetName}로 이동했습니다.`,
    });
  } catch (error) {
    logger.error('조원 이동 실패:', error);
    return NextResponse.json({ error: '조원 이동 중 오류가 발생했습니다' }, { status: 500 });
  }
}

// ============================================================
// 조 편성 알고리즘
// ============================================================

function buildAffinityMatrix(
  dailyFeaturedParticipants: Record<string, DailyMatchingEntry>,
  allParticipantIds: string[]
): { matrix: AffinityMatrix; clusterCounts: Map<string, number> } {
  const matrix: AffinityMatrix = new Map();
  const clusterCounts = new Map<string, number>();

  for (const pid of allParticipantIds) {
    matrix.set(pid, new Map());
    clusterCounts.set(pid, 0);
  }

  for (const [, entry] of Object.entries(dailyFeaturedParticipants)) {
    if (entry.matchingVersion !== 'cluster' || !entry.clusters) continue;

    for (const cluster of Object.values(entry.clusters)) {
      const members = cluster.memberIds.filter((id) => allParticipantIds.includes(id));

      for (const memberId of members) {
        clusterCounts.set(memberId, (clusterCounts.get(memberId) || 0) + 1);
      }

      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const a = members[i];
          const b = members[j];
          matrix.get(a)?.set(b, (matrix.get(a)?.get(b) || 0) + 1);
          matrix.get(b)?.set(a, (matrix.get(b)?.get(a) || 0) + 1);
        }
      }
    }
  }

  return { matrix, clusterCounts };
}

function formGroups(
  allParticipantIds: string[],
  matrix: AffinityMatrix,
  clusterCounts: Map<string, number>,
  actualSubmissionCounts: Map<string, number>,
  participantInfoMap: Map<string, ParticipantInfo>,
  targetGroupSize: number,
  hasClusterData: boolean
): ClosingPartyGroup[] {
  // Tier 기준값 계산 (표시용)
  const maxSubmissions = Math.max(...Array.from(actualSubmissionCounts.values()), 1);

  const groups: ClosingPartyGroup[] = [];
  const candidates = [...allParticipantIds];
  let groupNumber = 1;

  logger.info(`Forming groups for ${candidates.length} participants using pure affinity`);

  // 순수 친밀도 기반 그룹핑 (Tier 분리 없음)
  while (candidates.length >= GROUP_SIZE.MIN) {
    const group = formSingleGroup(
      candidates,
      matrix,
      actualSubmissionCounts,
      participantInfoMap,
      targetGroupSize,
      maxSubmissions,
      groupNumber++,
      hasClusterData
    );

    if (group.members.length > 0) {
      groups.push(group);
      for (const member of group.members) {
        const idx = candidates.indexOf(member.participantId);
        if (idx > -1) candidates.splice(idx, 1);
      }
    } else {
      break;
    }
  }

  // 잔여 인원 처리
  if (candidates.length > 0) {
    handleRemainingParticipants(
      groups,
      candidates,
      matrix,
      actualSubmissionCounts,
      participantInfoMap,
      maxSubmissions,
      targetGroupSize,
      groupNumber
    );
  }

  // 성비 균형 후처리
  balanceGenderAcrossGroups(groups, participantInfoMap, matrix);

  return groups;
}

function formSingleGroup(
  candidates: string[],
  matrix: AffinityMatrix,
  actualSubmissionCounts: Map<string, number>,
  participantInfoMap: Map<string, ParticipantInfo>,
  targetSize: number,
  maxSubmissions: number,
  groupNumber: number,
  hasClusterData: boolean
): ClosingPartyGroup {
  if (candidates.length === 0) {
    return { groupId: '', groupNumber, members: [], tier: 'inactive', averageAffinity: 0 };
  }

  // 시드 선택: 총 친밀도 합이 가장 높은 사람
  let seed = candidates[0];
  let maxTotalAffinity = 0;

  for (const pid of candidates) {
    let total = 0;
    for (const other of candidates) {
      if (other !== pid) total += matrix.get(pid)?.get(other) || 0;
    }
    if (total > maxTotalAffinity) {
      maxTotalAffinity = total;
      seed = pid;
    }
  }

  const group: string[] = [seed];
  const remaining = candidates.filter((p) => p !== seed);

  // Greedy하게 친밀도 높은 사람 추가 (최대 GROUP_SIZE.MAX까지)
  const effectiveTargetSize = Math.min(targetSize, GROUP_SIZE.MAX);
  while (group.length < effectiveTargetSize && remaining.length > 0) {
    let bestCandidate = remaining[0];
    let bestScore = -1;

    for (const candidate of remaining) {
      // 친밀도 기반 점수 (그룹 내 모든 멤버와의 친밀도 합)
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

  // 멤버 정보 생성
  const members: ClosingPartyGroupMember[] = group.map((pid) => {
    const info = participantInfoMap.get(pid);
    return {
      participantId: pid,
      name: info?.name || 'Unknown',
      profileImageCircle: info?.profileImageCircle,
      submissionCount: actualSubmissionCounts.get(pid) || 0,
    };
  });

  // 그룹 완성 후 평균 인증률로 Tier 계산
  const avgSubmissions = members.reduce((sum, m) => sum + m.submissionCount, 0) / members.length;
  const avgRatio = avgSubmissions / maxSubmissions;
  const tier: Tier = avgRatio >= 0.7 ? 'active' : avgRatio >= 0.3 ? 'moderate' : 'inactive';

  const averageAffinity = calculateAverageAffinity(group, matrix);

  return {
    groupId: `group-${groupNumber}`,
    groupNumber,
    members,
    tier,
    averageAffinity,
  };
}

function handleRemainingParticipants(
  groups: ClosingPartyGroup[],
  remaining: string[],
  matrix: AffinityMatrix,
  actualSubmissionCounts: Map<string, number>,
  participantInfoMap: Map<string, ParticipantInfo>,
  maxSubmissions: number,
  targetSize: number,
  nextGroupNumber: number
): void {
  if (remaining.length === 0) return;

  // GROUP_SIZE.MIN(4명) 이상이면 새 조 생성
  if (remaining.length >= GROUP_SIZE.MIN) {
    const members: ClosingPartyGroupMember[] = remaining.map((pid) => {
      const info = participantInfoMap.get(pid);
      return {
        participantId: pid,
        name: info?.name || 'Unknown',
        profileImageCircle: info?.profileImageCircle,
        submissionCount: actualSubmissionCounts.get(pid) || 0,
      };
    });

    // 평균 인증률로 Tier 계산
    const avgSubmissions = members.reduce((sum, m) => sum + m.submissionCount, 0) / members.length;
    const avgRatio = avgSubmissions / maxSubmissions;
    const tier: Tier = avgRatio >= 0.7 ? 'active' : avgRatio >= 0.3 ? 'moderate' : 'inactive';

    groups.push({
      groupId: `group-${nextGroupNumber}`,
      groupNumber: nextGroupNumber,
      members,
      tier,
      averageAffinity: calculateAverageAffinity(remaining, matrix),
    });
    return;
  }

  // 그룹이 없으면(또는 남은 인원이 3명 이하) 새 조 생성
  if (groups.length === 0) {
    const members: ClosingPartyGroupMember[] = remaining.map((pid) => {
      const info = participantInfoMap.get(pid);
      return {
        participantId: pid,
        name: info?.name || 'Unknown',
        profileImageCircle: info?.profileImageCircle,
        submissionCount: actualSubmissionCounts.get(pid) || 0,
      };
    });

    const avgSubmissions = members.reduce((sum, m) => sum + m.submissionCount, 0) / members.length;
    const avgRatio = avgSubmissions / maxSubmissions;
    const tier: Tier = avgRatio >= 0.7 ? 'active' : avgRatio >= 0.3 ? 'moderate' : 'inactive';

    groups.push({
      groupId: `group-${nextGroupNumber}`,
      groupNumber: nextGroupNumber,
      members,
      tier,
      averageAffinity: calculateAverageAffinity(remaining, matrix),
    });
    return;
  }

  // 3명 이하면 기존 조에 분배 (GROUP_SIZE.MAX까지 허용, 친밀도 높은 조 우선)
  for (let i = 0; i < remaining.length; i++) {
    const pid = remaining[i];
    const eligibleGroups = groups.filter((group) => group.members.length < GROUP_SIZE.MAX);

    if (eligibleGroups.length === 0) {
      const rest = remaining.slice(i);
      const members: ClosingPartyGroupMember[] = rest.map((rid) => {
        const info = participantInfoMap.get(rid);
        return {
          participantId: rid,
          name: info?.name || 'Unknown',
          profileImageCircle: info?.profileImageCircle,
          submissionCount: actualSubmissionCounts.get(rid) || 0,
        };
      });

      const avgSubmissions =
        members.reduce((sum, m) => sum + m.submissionCount, 0) / members.length;
      const avgRatio = avgSubmissions / maxSubmissions;
      const tier: Tier = avgRatio >= 0.7 ? 'active' : avgRatio >= 0.3 ? 'moderate' : 'inactive';

      groups.push({
        groupId: `group-${nextGroupNumber}`,
        groupNumber: nextGroupNumber,
        members,
        tier,
        averageAffinity: calculateAverageAffinity(rest, matrix),
      });
      return;
    }

    let bestGroup = eligibleGroups[0];
    let bestScore = -1;

    for (const group of eligibleGroups) {
      let score = 0;
      for (const member of group.members) {
        score += matrix.get(pid)?.get(member.participantId) || 0;
      }

      if (
        score > bestScore ||
        (score === bestScore && group.members.length < bestGroup.members.length)
      ) {
        bestScore = score;
        bestGroup = group;
      }
    }

    const info = participantInfoMap.get(pid);
    bestGroup.members.push({
      participantId: pid,
      name: info?.name || 'Unknown',
      profileImageCircle: info?.profileImageCircle,
      submissionCount: actualSubmissionCounts.get(pid) || 0,
    });

    // 멤버 추가 후 Tier 재계산
    const avgSubmissions =
      bestGroup.members.reduce((sum, m) => sum + m.submissionCount, 0) / bestGroup.members.length;
    const avgRatio = avgSubmissions / maxSubmissions;
    bestGroup.tier = avgRatio >= 0.7 ? 'active' : avgRatio >= 0.3 ? 'moderate' : 'inactive';
  }
}

function calculateAverageAffinity(memberIds: string[], matrix: AffinityMatrix): number {
  if (memberIds.length < 2) return 0;
  let total = 0,
    pairs = 0;
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      total += matrix.get(memberIds[i])?.get(memberIds[j]) || 0;
      pairs++;
    }
  }
  return pairs > 0 ? Math.round((total / pairs) * 100) / 100 : 0;
}

// ============================================================
// 성비 균형 후처리 로직
// ============================================================

/**
 * 그룹 내 성별 카운트
 */
function countGenderInGroup(
  members: ClosingPartyGroupMember[],
  participantInfoMap: Map<string, ParticipantInfo>
): GenderCount {
  const count: GenderCount = { male: 0, female: 0, other: 0, unknown: 0 };

  for (const member of members) {
    const info = participantInfoMap.get(member.participantId);
    const gender = info?.gender;

    if (gender === 'male') count.male++;
    else if (gender === 'female') count.female++;
    else if (gender === 'other') count.other++;
    else count.unknown++;
  }

  return count;
}

/**
 * 성비 불균형 여부 체크
 * 한 성별이 그룹의 2/3를 초과하면 불균형
 */
function isGenderImbalanced(count: GenderCount): boolean {
  // other/unknown은 성비 계산에서 제외
  const knownGenderCount = count.male + count.female;
  if (knownGenderCount < 2) return false; // 알려진 성별이 2명 미만이면 체크 불가

  const maxAllowed = Math.floor(knownGenderCount * GENDER_BALANCE.MAX_RATIO);

  return count.male > maxAllowed || count.female > maxAllowed;
}

/**
 * 멤버의 그룹 내 친밀도 합계 계산
 */
function calculateMemberAffinity(
  memberId: string,
  groupMembers: ClosingPartyGroupMember[],
  matrix: AffinityMatrix
): number {
  let sum = 0;
  for (const other of groupMembers) {
    if (other.participantId !== memberId) {
      sum += matrix.get(memberId)?.get(other.participantId) || 0;
    }
  }
  return sum;
}

/**
 * 교환 후 양쪽 그룹의 균형 유지 여부 확인
 */
function canSwapMaintainBalance(
  groupA: ClosingPartyGroup,
  groupB: ClosingPartyGroup,
  memberFromA: ClosingPartyGroupMember,
  memberFromB: ClosingPartyGroupMember,
  participantInfoMap: Map<string, ParticipantInfo>
): boolean {
  // 가상 교환 후 성비 계산
  const newMembersA = groupA.members
    .filter((m) => m.participantId !== memberFromA.participantId)
    .concat([memberFromB]);

  const newMembersB = groupB.members
    .filter((m) => m.participantId !== memberFromB.participantId)
    .concat([memberFromA]);

  const countA = countGenderInGroup(newMembersA, participantInfoMap);
  const countB = countGenderInGroup(newMembersB, participantInfoMap);

  // 양쪽 모두 균형이 유지되어야 함
  return (
    !isGenderImbalanced(countA) &&
    !isGenderImbalanced(countB)
  );
}

/**
 * 실제 멤버 교환 수행
 */
function performSwap(
  groupA: ClosingPartyGroup,
  groupB: ClosingPartyGroup,
  memberFromA: ClosingPartyGroupMember,
  memberFromB: ClosingPartyGroupMember
): void {
  // A에서 제거, B에서 추가
  const idxA = groupA.members.findIndex((m) => m.participantId === memberFromA.participantId);
  groupA.members.splice(idxA, 1);
  groupA.members.push(memberFromB);

  // B에서 제거, A에서 추가
  const idxB = groupB.members.findIndex((m) => m.participantId === memberFromB.participantId);
  groupB.members.splice(idxB, 1);
  groupB.members.push(memberFromA);
}

/**
 * 성비 균형을 위한 멤버 교환 시도
 */
function trySwapForBalance(
  imbalancedGroup: ClosingPartyGroup,
  allGroups: ClosingPartyGroup[],
  dominantGender: 'male' | 'female',
  minorityGender: 'male' | 'female',
  participantInfoMap: Map<string, ParticipantInfo>,
  matrix: AffinityMatrix
): void {
  // 불균형 그룹에서 과잉 성별 멤버 찾기 (친밀도 낮은 순)
  const dominantMembers = imbalancedGroup.members
    .filter((m) => {
      const info = participantInfoMap.get(m.participantId);
      return info?.gender === dominantGender;
    })
    .map((m) => ({
      member: m,
      submissionCount: m.submissionCount || 0,
      affinitySum: calculateMemberAffinity(m.participantId, imbalancedGroup.members, matrix),
    }))
    .sort((a, b) => {
      if (a.submissionCount !== b.submissionCount) {
        return a.submissionCount - b.submissionCount;
      }
      return a.affinitySum - b.affinitySum;
    }); // 인증 적은 순 → 친밀도 낮은 순

  // 다른 그룹에서 교환 대상 찾기
  for (const candidate of dominantMembers) {
    for (const otherGroup of allGroups) {
      if (otherGroup.groupId === imbalancedGroup.groupId) continue;

      // 다른 그룹에서 소수 성별 멤버 찾기 (불균형 그룹과의 친밀도 높은 순)
      const swapCandidates = otherGroup.members
        .filter((m) => {
          const info = participantInfoMap.get(m.participantId);
          return info?.gender === minorityGender;
        })
        .map((m) => ({
          member: m,
          submissionCount: m.submissionCount || 0,
          // 불균형 그룹 멤버들과의 친밀도 합 (교환 후 친밀도 유지를 위해)
          affinityWithTarget: calculateMemberAffinity(
            m.participantId,
            imbalancedGroup.members,
            matrix
          ),
        }))
        .sort((a, b) => {
          if (a.submissionCount !== b.submissionCount) {
            return a.submissionCount - b.submissionCount;
          }
          return b.affinityWithTarget - a.affinityWithTarget;
        }); // 인증 적은 순 → 친밀도 높은 순

      for (const { member: swapTarget } of swapCandidates) {
        // 교환 후 양쪽 그룹 모두 균형이 유지되는지 확인
        if (
          canSwapMaintainBalance(
            imbalancedGroup,
            otherGroup,
            candidate.member,
            swapTarget,
            participantInfoMap
          )
        ) {
          // 실제 교환 수행
          performSwap(imbalancedGroup, otherGroup, candidate.member, swapTarget);

          // 친밀도 재계산
          imbalancedGroup.averageAffinity = calculateAverageAffinity(
            imbalancedGroup.members.map((m) => m.participantId),
            matrix
          );
          otherGroup.averageAffinity = calculateAverageAffinity(
            otherGroup.members.map((m) => m.participantId),
            matrix
          );

          // Tier를 mixed로 변경 (수동 조정됨을 표시)
          imbalancedGroup.tier = 'mixed';
          otherGroup.tier = 'mixed';

          logger.info(
            `Gender balance swap: ${candidate.member.name} <-> ${swapTarget.name} between groups ${imbalancedGroup.groupNumber} and ${otherGroup.groupNumber}`
          );

          return; // 한 번의 교환으로 충분할 수 있음
        }
      }
    }
  }

  // 교환 실패 시 로그 기록
  logger.warn(
    `Could not balance gender in group ${imbalancedGroup.groupNumber}. Manual adjustment may be needed.`
  );
}

/**
 * 성비 균형 후처리
 * 친밀도 기반으로 그룹을 먼저 구성한 후,
 * 심한 불균형(4:2 초과)만 조정
 */
function balanceGenderAcrossGroups(
  groups: ClosingPartyGroup[],
  participantInfoMap: Map<string, ParticipantInfo>,
  matrix: AffinityMatrix
): void {
  // 불참조(absent)는 제외
  const activeGroups = groups.filter((g) => g.groupId !== 'absent');

  for (const group of activeGroups) {
    const genderCount = countGenderInGroup(group.members, participantInfoMap);

    // 심한 불균형 체크 (한 성별이 2/3 초과)
    if (!isGenderImbalanced(genderCount)) {
      continue;
    }

    // 과잉 성별 찾기
    const dominantGender = genderCount.male > genderCount.female ? 'male' : 'female';
    const minorityGender = dominantGender === 'male' ? 'female' : 'male';

    logger.info(
      `Group ${group.groupNumber} has gender imbalance: male=${genderCount.male}, female=${genderCount.female}. Attempting to balance.`
    );

    // 교환 가능한 후보 찾기
    trySwapForBalance(
      group,
      activeGroups,
      dominantGender,
      minorityGender,
      participantInfoMap,
      matrix
    );
  }
}
