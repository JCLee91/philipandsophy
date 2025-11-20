/**
 * 클러스터 매칭 시스템 v3.0
 *
 * 매일 어제 인증한 참가자들을 AI로 클러스터링하여 매칭
 * - 책 제목/장르 무시 (며칠간 같은 책을 읽기 때문)
 * - 오직 "오늘의 감상평 + 오늘의 답변"만 분석
 * - **2가지 모드 자동 분기:**
 *   - 1~7명: 소규모 그룹 (1개 클러스터, 공통점 추출)
 *   - 8명 이상: 다중 클러스터 (여러 그룹으로 나누기)
 * - 클러스터 내 전원 매칭 (본인 제외)
 *
 * @version 3.0.1
 * @date 2025-11-19
 */

import { generateObject, LanguageModel } from 'ai';
import { z } from 'zod';
import { Cluster, ClusterMatchingResult, ClusterSchema, DailySubmission } from './types';
import { CLUSTER_CONFIG, generateClusterPrompt, getClusteringStrategy } from './prompt';
import { validateClusters } from './validation';

// Firebase Functions 환경에서는 logger를 직접 사용
const logger = {
    error: (message: string, ...args: any[]) => console.error(message, ...args),
    warn: (message: string, ...args: any[]) => console.warn(message, ...args),
    info: (message: string, ...args: any[]) => console.info(message, ...args),
};

// ============================================================
// 클러스터 개수 계산
// ============================================================

/**
 * 최적 클러스터 개수 계산 (유연한 매칭)
 *
 * @param providerCount 어제 인증한 참가자 수
 * @returns 클러스터 개수
 */
function calculateOptimalClusterCount(providerCount: number): number {
    const { MIN_SIZE, MAX_SIZE, TARGET_SIZE } = CLUSTER_CONFIG;

    // 1. 1~4명: 1개 클러스터로 강제 처리
    if (providerCount <= 4) {
        logger.warn(`[Cluster Config] ${providerCount}명은 적지만 1개 클러스터로 처리`);
        return 1;
    }

    // 2. 8-9명 특수 케이스 (최선의 방법으로 처리)
    if (providerCount === 8) {
        logger.warn(`[Cluster Config] 8명은 이상적이지 않지만 4명씩 2개로 처리`);
        return 2; // 4명씩 2개 클러스터
    }
    if (providerCount === 9) {
        logger.warn(`[Cluster Config] 9명은 이상적이지 않지만 4명+5명 2개로 처리`);
        return 2; // 4명 + 5명
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
// AI 클러스터 생성 (Main Function)
// ============================================================

/**
 * AI로 오늘의 클러스터 생성
 *
 * **2가지 모드로 자동 분기:**
 * - 1~7명: 소규모 그룹 모드 (1개 클러스터, 공통점 추출 중심)
 * - 8명 이상: 다중 클러스터 모드 (여러 클러스터로 나누기)
 *
 * ⚠️ 중요: 책 제목은 감상평 맥락 이해용, 같은 책이라고 같은 클러스터에 넣지 않음
 *
 * @param submissions 오늘의 독서 인증 데이터
 * @param targetClusterCount 목표 클러스터 개수
 * @param dateStr 매칭 날짜 (전략 결정용)
 * @returns 클러스터 배열 (소규모: 1개, 다중: targetClusterCount±1개)
 */
export async function generateDailyClusters(
    submissions: DailySubmission[],
    targetClusterCount: number,
    dateStr: string
): Promise<Cluster[]> {
    const participantCount = submissions.length;
    const membersPerCluster = Math.ceil(participantCount / targetClusterCount);
    const strategy = getClusteringStrategy(dateStr);
    const isSmallGroup = participantCount <= 7; // 소규모 그룹 (나누기 X, 공통점 찾기 O)
    const isEdgeCase = participantCount === 8 || participantCount === 9; // 8/9명 엣지 케이스

    logger.info(
        `[AI Clustering] 시작: ${participantCount}명 → ${targetClusterCount}개 클러스터 (${membersPerCluster}명/클러스터 목표)\n` +
        `[전략] ${strategy.mode === 'focused' ? `초점: ${strategy.focus}` : 'AI 자율 판단'}\n` +
        `[모드] ${isSmallGroup ? '소규모 그룹 - 공통점 추출' : isEdgeCase ? '엣지 케이스 - 2개(4~5명)' : '다중 클러스터 - 그룹 나누기'}`
    );

    try {
        const prompt = generateClusterPrompt(submissions, strategy, {
            participantCount,
            targetClusterCount,
            membersPerCluster,
            isSmallGroup,
            isEdgeCase
        });

        const schema = z.object({
            clusters: z.array(ClusterSchema)
        });

        const result = await generateObject({
            // @ts-ignore: AI SDK 5 supports string models for Vercel AI Gateway
            model: 'anthropic/claude-haiku-4.5' as unknown as LanguageModel, // ✅ Vercel AI Gateway 자동 라우팅
            schema,
            prompt
        });

        const clusters = result.object.clusters;

        validateClusters(clusters, submissions, {
            participantCount,
            targetClusterCount,
            isSmallGroup,
            isEdgeCase
        });

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
            // 같은 클러스터의 모든 멤버 (본인 포함)
            const assigned = [...memberIds];

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

// Re-export types for convenience
export * from './types';
