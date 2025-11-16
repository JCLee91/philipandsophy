/**
 * 클러스터 매칭 시스템 v3.0
 *
 * 매일 어제 인증한 참가자들을 AI로 클러스터링하여 매칭
 * - 책 제목/장르 무시 (며칠간 같은 책을 읽기 때문)
 * - 오직 "오늘의 감상평 + 오늘의 답변"만 분석
 * - 클러스터 크기: 5-7명 (프로필북 4-6개 보임)
 * - 클러스터 내 전원 매칭 (본인 제외)
 *
 * @version 3.0.0
 * @date 2025-11-15
 */

import { generateObject } from 'ai';
import { z } from 'zod';

// Vercel AI Gateway를 통해 AI 모델 접근
// 환경 변수: AI_GATEWAY_API_KEY
// 자동으로 https://ai-gateway.vercel.sh/v1/ai 사용

// Firebase Functions 환경에서는 logger를 직접 사용
const logger = {
  error: (message: string, ...args: any[]) => console.error(message, ...args),
  warn: (message: string, ...args: any[]) => console.warn(message, ...args),
  info: (message: string, ...args: any[]) => console.info(message, ...args),
};

// ============================================================
// 타입 정의
// ============================================================

/**
 * 참가자 정보 (클러스터링용)
 */
export interface ParticipantForClustering {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
}

/**
 * 독서 인증 정보 (오늘의 감상평 + 답변)
 */
export interface DailySubmission {
  participantId: string;
  participantName: string;
  gender?: string;
  bookTitle: string;     // ✅ 책 제목 (감상평 맥락 이해용)
  bookAuthor?: string;   // ✅ 저자 (선택)
  review: string;        // ✅ 오늘의 감상평
  dailyQuestion: string; // ✅ 오늘의 질문
  dailyAnswer: string;   // ✅ 오늘의 답변
}

/**
 * 클러스터 정보
 */
export interface Cluster {
  id: string;
  name: string;
  emoji: string;
  theme: string;
  memberIds: string[];
  reasoning: string;
}

/**
 * 클러스터 매칭 결과
 */
export interface ClusterMatchingResult {
  clusters: Record<string, Cluster>;
  assignments: Record<string, {
    assigned: string[];
    clusterId: string;
  }>;
}

// ============================================================
// 상수 설정
// ============================================================

const CLUSTER_CONFIG = {
  /** 본인 포함 최소 크기 (프로필북 4개 보임) */
  MIN_SIZE: 5,
  /** 본인 포함 최대 크기 (프로필북 6개 보임) */
  MAX_SIZE: 7,
  /** 목표 크기 */
  TARGET_SIZE: 6,
} as const;

// ============================================================
// 클러스터 개수 계산
// ============================================================

/**
 * 최적 클러스터 개수 계산 (5-7명 범위 보장)
 *
 * @param providerCount 어제 인증한 참가자 수
 * @returns 클러스터 개수
 *
 * @example
 * calculateOptimalClusterCount(8)  // 2개 (4명씩 - MIN_SIZE 5명 미만이지만 최선)
 * calculateOptimalClusterCount(10) // 2개 (5명씩)
 * calculateOptimalClusterCount(20) // 3개 (6~7명)
 * calculateOptimalClusterCount(30) // 5개 (6명씩)
 */
function calculateOptimalClusterCount(providerCount: number): number {
  const { MIN_SIZE, MAX_SIZE, TARGET_SIZE } = CLUSTER_CONFIG;

  // 1. 최소 인원 미달
  if (providerCount < MIN_SIZE) {
    throw new Error(
      `클러스터링 불가: 최소 ${MIN_SIZE}명 필요 (현재 ${providerCount}명)`
    );
  }

  // 2. 5-7명 범위로 나눌 수 없는 인원 (8-9명)
  if (providerCount > MAX_SIZE && providerCount < MIN_SIZE * 2) {
    throw new Error(
      `클러스터링 불가: ${providerCount}명은 ${MIN_SIZE}-${MAX_SIZE}명 범위로 나눌 수 없음 ` +
      `(${MIN_SIZE}-${MAX_SIZE}명 또는 ${MIN_SIZE * 2}명 이상 필요)`
    );
  }

  // 3. 최소 필요 클러스터 수 (MAX_SIZE 초과 방지)
  const minClusters = Math.ceil(providerCount / MAX_SIZE);

  // 4. 최대 가능 클러스터 수 (MIN_SIZE 미만 방지)
  const maxClusters = Math.floor(providerCount / MIN_SIZE);

  // 5. 목표 클러스터 수 (TARGET_SIZE 기준)
  const targetClusters = Math.round(providerCount / TARGET_SIZE);

  // 6. 범위 내로 제한
  const clusterCount = Math.max(minClusters, Math.min(maxClusters, targetClusters));

  logger.info(
    `[Cluster Config] ${providerCount}명 → ${clusterCount}개 클러스터 ` +
    `(${Math.floor(providerCount / clusterCount)}~${Math.ceil(providerCount / clusterCount)}명/클러스터, ` +
    `범위: min=${minClusters}, max=${maxClusters}, target=${targetClusters})`
  );

  return clusterCount;
}

// ============================================================
// 클러스터링 전략 결정
// ============================================================

/**
 * 클러스터링 전략 타입
 */
interface ClusteringStrategy {
  mode: 'focused' | 'autonomous';
  focus?: string;
  instruction: string;
}

/**
 * 날짜 기반 클러스터링 전략 결정 (3일 주기 순환)
 *
 * - Day 0, 3, 6, 9... : 가치관 중심
 * - Day 1, 4, 7, 10...: 감정/정서 중심
 * - Day 2, 5, 8, 11...: AI 자율 판단
 *
 * @param dateStr 매칭 날짜 (YYYY-MM-DD)
 * @returns 오늘의 클러스터링 전략
 */
function getClusteringStrategy(dateStr: string): ClusteringStrategy {
  const dayOfMonth = new Date(dateStr).getDate();
  const cycle = dayOfMonth % 3;

  switch (cycle) {
    case 0: // 가치관 중심일
      return {
        mode: 'focused',
        focus: '가치관과 삶의 우선순위',
        instruction: '오늘의 답변에서 드러나는 가치관과 삶의 우선순위를 최우선 기준으로 그룹핑하세요.'
      };

    case 1: // 감정/정서 중심일
      return {
        mode: 'focused',
        focus: '현재 감정 상태와 정서적 톤',
        instruction: '감상평과 답변에서 느껴지는 감정 상태, 에너지, 정서적 톤을 최우선 기준으로 그룹핑하세요.'
      };

    case 2: // AI 자율 판단일
      return {
        mode: 'autonomous',
        instruction: '오늘의 데이터에서 가장 의미있는 차원을 스스로 발견하고, 그 기준으로 그룹핑하세요. 매번 다른 관점을 시도하세요. (예: 사고 방식, 관심 주제, 표현 스타일, 책 반응 깊이 등)'
      };

    default:
      return {
        mode: 'focused',
        focus: '가치관과 삶의 우선순위',
        instruction: '오늘의 답변에서 드러나는 가치관과 삶의 우선순위를 최우선 기준으로 그룹핑하세요.'
      };
  }
}

// ============================================================
// AI 클러스터 생성
// ============================================================

const ClusterSchema = z.object({
  id: z.string().describe('클러스터 ID (cluster1, cluster2, ...)'),
  name: z.string().describe('클러스터 이름 (예: "오늘의 사색파")'),
  emoji: z.string().describe('이모지 1개'),
  theme: z.string().describe('오늘의 주제/테마 (AI가 분석한 공통점, 한 문장)'),
  memberIds: z.array(z.string()).describe('클러스터 멤버 ID 배열'),
  reasoning: z.string().describe('AI 분석 근거 (왜 이 사람들을 묶었는지)')
});

/**
 * AI로 오늘의 클러스터 생성
 *
 * ⚠️ 중요: 책 제목은 감상평 맥락 이해용, 같은 책이라고 같은 클러스터에 넣지 않음
 *
 * @param submissions 오늘의 독서 인증 데이터
 * @param targetClusterCount 목표 클러스터 개수
 * @param dateStr 매칭 날짜 (전략 결정용)
 * @returns 클러스터 배열
 */
export async function generateDailyClusters(
  submissions: DailySubmission[],
  targetClusterCount: number,
  dateStr: string
): Promise<Cluster[]> {
  const participantCount = submissions.length;
  const membersPerCluster = Math.ceil(participantCount / targetClusterCount);
  const strategy = getClusteringStrategy(dateStr);

  logger.info(
    `[AI Clustering] 시작: ${participantCount}명 → ${targetClusterCount}개 클러스터 (${membersPerCluster}명/클러스터 목표)\n` +
    `[전략] ${strategy.mode === 'focused' ? `초점: ${strategy.focus}` : 'AI 자율 판단'}`
  );

  try {
    const result = await generateObject({
      model: 'openai/gpt-4o-mini', // ✅ Vercel AI Gateway 자동 사용
      schema: z.object({
        clusters: z.array(ClusterSchema)
      }),
      prompt: `
오늘 독서 인증을 한 ${participantCount}명을 ${targetClusterCount}개 그룹으로 나눠주세요.
각 그룹은 약 ${membersPerCluster}명씩입니다.

[전략 모드: ${strategy.mode}]
${strategy.mode === 'focused' ? `오늘의 클러스터링 초점: ${strategy.focus}` : ''}

${strategy.instruction}

⚠️ 중요 규칙:
1. 같은 책을 읽는다고 같은 클러스터에 넣지 마세요
   - 여러 날 같은 책을 읽으므로 책 자체는 기준이 아님
   - 책 정보는 감상평 맥락 이해를 위한 참고용으로만 사용
2. 오늘의 감상평 + 오늘의 답변이 진짜 클러스터 기준입니다
3. 그날그날 다른 생각/느낌을 기준으로 그룹핑하세요

참가자 데이터:
${submissions.map(s => `
[${s.participantId}] ${s.participantName}
- 읽은 책: ${s.bookTitle}${s.bookAuthor ? ` (${s.bookAuthor})` : ''}
- 오늘의 감상평: ${s.review}
- 오늘의 질문: ${s.dailyQuestion}
- 오늘의 답변: ${s.dailyAnswer}
`).join('\n---\n')}

${strategy.mode === 'autonomous' ? `
먼저 오늘의 데이터 특성을 간단히 분석하고, 어떤 기준으로 나눌지 스스로 결정한 후,
그 기준으로 클러스터를 만드세요.
` : ''}

클러스터 이름 규칙:
- "오늘의 XXX" 형태로 작성
- 이모지 1개 추가
- theme은 그날 공통 주제를 한 문장으로 (30자 이내)

예시:
{
  "id": "cluster1",
  "name": "오늘의 사색파",
  "emoji": "📚",
  "theme": "죽음과 존재의 의미를 탐구하는 철학적 사유",
  "memberIds": ["user1", "user2", "user3", "user4", "user5", "user6"],
  "reasoning": "모두 '죽음'에 대한 질문에 철학적으로 접근하고, 감상평도 깊은 사유가 담김"
}

⚠️ 필수 제약:
- 모든 참가자 포함: 총합 ${participantCount}명 정확히 배정
- 클러스터 크기: 최소 ${CLUSTER_CONFIG.MIN_SIZE}명, 최대 ${CLUSTER_CONFIG.MAX_SIZE}명
      `.trim()
    });

    const clusters = result.object.clusters;

    // ============================================================
    // 종합 검증
    // ============================================================

    const errors: string[] = [];

    // 1. 제출된 참가자 ID 집합
    const submittedIds = new Set(submissions.map(s => s.participantId));

    // 2. 클러스터에 배정된 모든 ID 수집 (중복 체크)
    const assignedIds = new Set<string>();
    const duplicateIds = new Set<string>();

    for (const cluster of clusters) {
      for (const memberId of cluster.memberIds) {
        if (assignedIds.has(memberId)) {
          duplicateIds.add(memberId);
        }
        assignedIds.add(memberId);
      }
    }

    // 3. 중복 ID 체크
    if (duplicateIds.size > 0) {
      errors.push(`중복 배정된 ID: ${Array.from(duplicateIds).join(', ')}`);
    }

    // 4. 누락된 ID 체크
    const missingIds = [...submittedIds].filter(id => !assignedIds.has(id));
    if (missingIds.length > 0) {
      errors.push(`누락된 참가자 ID: ${missingIds.join(', ')}`);
    }

    // 5. 존재하지 않는 ID 체크
    const invalidIds = [...assignedIds].filter(id => !submittedIds.has(id));
    if (invalidIds.length > 0) {
      errors.push(`존재하지 않는 ID: ${invalidIds.join(', ')}`);
    }

    // 6. 클러스터 크기 검증 (5-7명)
    const invalidSizeClusters = clusters.filter(
      c => c.memberIds.length < CLUSTER_CONFIG.MIN_SIZE ||
           c.memberIds.length > CLUSTER_CONFIG.MAX_SIZE
    );
    if (invalidSizeClusters.length > 0) {
      errors.push(
        `크기 제약 위반 클러스터: ${invalidSizeClusters.map(c =>
          `${c.id}(${c.memberIds.length}명)`
        ).join(', ')} (허용 범위: ${CLUSTER_CONFIG.MIN_SIZE}-${CLUSTER_CONFIG.MAX_SIZE}명)`
      );
    }

    // 7. 클러스터 개수 검증 (목표 ±1 허용)
    if (Math.abs(clusters.length - targetClusterCount) > 1) {
      errors.push(
        `클러스터 개수 불일치: 목표 ${targetClusterCount}개, 실제 ${clusters.length}개`
      );
    }

    // 8. 검증 실패 시 에러
    if (errors.length > 0) {
      logger.error(
        `[AI Clustering] 검증 실패:\n` +
        errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
      );
      throw new Error(`AI 클러스터링 검증 실패: ${errors.length}개 오류 발견`);
    }

    logger.info(
      `[AI Clustering] 완료: ${clusters.length}개 클러스터 생성\n` +
      clusters.map(c => `  - ${c.emoji} ${c.name} (${c.memberIds.length}명)`).join('\n')
    );

    return clusters;
  } catch (error) {
    logger.error('[AI Clustering] 실패:', error);
    throw error;
  }
}

// ============================================================
// 클러스터 내 매칭
// ============================================================

/**
 * 클러스터 내 전원 매칭
 *
 * 각 클러스터 멤버는 같은 클러스터의 다른 모든 멤버를 받음 (본인 제외)
 *
 * @param clusters 클러스터 배열
 * @returns 매칭 결과
 */
export function matchWithinClusters(
  clusters: Cluster[]
): Record<string, { assigned: string[]; clusterId: string }> {
  const assignments: Record<string, { assigned: string[]; clusterId: string }> = {};

  for (const cluster of clusters) {
    const { id: clusterId, memberIds } = cluster;

    for (const memberId of memberIds) {
      // 같은 클러스터의 다른 모든 멤버 (본인 제외)
      const assigned = memberIds.filter(id => id !== memberId);

      assignments[memberId] = {
        assigned,
        clusterId
      };

      logger.info(
        `[Matching] ${memberId} → ${assigned.length}개 프로필북 (${clusterId})`
      );
    }
  }

  return assignments;
}

// ============================================================
// 메인 클러스터 매칭 함수
// ============================================================

/**
 * 클러스터 매칭 실행 (v3.0)
 *
 * @param submissions 어제 인증한 참가자들의 감상평 + 답변
 * @param dateStr 매칭 날짜 (YYYY-MM-DD)
 * @returns 클러스터 매칭 결과
 */
export async function matchParticipantsWithClusters(
  submissions: DailySubmission[],
  dateStr: string
): Promise<ClusterMatchingResult> {
  logger.info(`[Cluster Matching v3.0] 시작: ${submissions.length}명 (${dateStr})`);

  try {
    // 1. 클러스터 개수 계산
    const clusterCount = calculateOptimalClusterCount(submissions.length);

    // 2. AI로 클러스터 생성
    const clusters = await generateDailyClusters(submissions, clusterCount, dateStr);

    // 3. 클러스터 내 매칭
    const assignments = matchWithinClusters(clusters);

    // 4. 클러스터 Record 형태로 변환
    const clustersRecord = clusters.reduce((acc, cluster) => {
      acc[cluster.id] = cluster;
      return acc;
    }, {} as Record<string, Cluster>);

    logger.info(
      `[Cluster Matching v3.0] 완료: ` +
      `${clusters.length}개 클러스터, ${Object.keys(assignments).length}명 할당`
    );

    return {
      clusters: clustersRecord,
      assignments
    };
  } catch (error) {
    logger.error('[Cluster Matching v3.0] 실패:', error);
    throw error;
  }
}
