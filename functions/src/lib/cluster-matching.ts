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
 * 최적 클러스터 개수 계산
 *
 * @param providerCount 어제 인증한 참가자 수
 * @returns 클러스터 개수
 *
 * @example
 * calculateOptimalClusterCount(10) // 2개 (5명씩)
 * calculateOptimalClusterCount(20) // 3개 (6~7명)
 * calculateOptimalClusterCount(30) // 5개 (6명씩)
 */
function calculateOptimalClusterCount(providerCount: number): number {
  const { MIN_SIZE, TARGET_SIZE } = CLUSTER_CONFIG;

  if (providerCount < MIN_SIZE) {
    throw new Error(
      `클러스터링 불가: 최소 ${MIN_SIZE}명 필요 (현재 ${providerCount}명)`
    );
  }

  const clusterCount = Math.max(1, Math.round(providerCount / TARGET_SIZE));

  logger.info(
    `[Cluster Config] ${providerCount}명 → ${clusterCount}개 클러스터 ` +
    `(평균 ${Math.round(providerCount / clusterCount)}명/클러스터)`
  );

  return clusterCount;
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
 * ⚠️ 중요: 책 제목/장르는 무시하고, 오직 감상평 + 답변만 분석
 *
 * @param submissions 오늘의 독서 인증 데이터
 * @param targetClusterCount 목표 클러스터 개수
 * @returns 클러스터 배열
 */
export async function generateDailyClusters(
  submissions: DailySubmission[],
  targetClusterCount: number
): Promise<Cluster[]> {
  const participantCount = submissions.length;
  const membersPerCluster = Math.ceil(participantCount / targetClusterCount);

  logger.info(
    `[AI Clustering] 시작: ${participantCount}명 → ${targetClusterCount}개 클러스터 (${membersPerCluster}명/클러스터 목표)`
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

⚠️ 중요 규칙:
1. 책 제목/장르는 완전히 무시하세요 (며칠간 같은 책을 읽기 때문)
2. 오직 "오늘의 감상평 + 오늘의 답변"만 분석하세요
3. 그날그날 다른 생각/느낌을 기준으로 그룹핑하세요

참가자 데이터:
${submissions.map(s => `
[${s.participantId}] ${s.participantName}
- 오늘의 감상평: ${s.review}
- 오늘의 질문: ${s.dailyQuestion}
- 오늘의 답변: ${s.dailyAnswer}
`).join('\n---\n')}

그룹핑 기준 (중요도 순):
1. 🎯 가치관 (답변 분석) - 가장 중요
   예: 가족 중심 vs 성취 중심, 현실적 vs 이상적, 관계 중심 vs 독립적
2. ✍️ 감상평 스타일
   예: 감성적 vs 분석적, 짧은 메모 vs 긴 에세이, 개인적 vs 보편적
3. 💭 오늘의 정서/감정
   예: 희망적 vs 고민 중, 활력 vs 차분함, 열정 vs 사색

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

    // 검증
    const totalMembers = clusters.reduce((sum, c) => sum + c.memberIds.length, 0);
    if (totalMembers !== participantCount) {
      logger.error(
        `[AI Clustering] 검증 실패: 참가자 ${participantCount}명 중 ${totalMembers}명만 배정됨`
      );
      throw new Error('AI 클러스터링 검증 실패: 참가자 수 불일치');
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
 * @returns 클러스터 매칭 결과
 */
export async function matchParticipantsWithClusters(
  submissions: DailySubmission[]
): Promise<ClusterMatchingResult> {
  logger.info(`[Cluster Matching v3.0] 시작: ${submissions.length}명`);

  try {
    // 1. 클러스터 개수 계산
    const clusterCount = calculateOptimalClusterCount(submissions.length);

    // 2. AI로 클러스터 생성
    const clusters = await generateDailyClusters(submissions, clusterCount);

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
