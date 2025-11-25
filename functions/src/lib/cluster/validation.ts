import { Cluster, DailySubmission } from './types';
import { CLUSTER_CONFIG } from './prompt';

// Firebase Functions 환경에서는 logger를 직접 사용
const logger = {
    error: (message: string, ...args: any[]) => console.error(message, ...args),
    warn: (message: string, ...args: any[]) => console.warn(message, ...args),
    info: (message: string, ...args: any[]) => console.info(message, ...args),
};

/**
 * 생성된 클러스터 검증
 */
export function validateClusters(
    clusters: Cluster[],
    submissions: DailySubmission[],
    config: {
        participantCount: number;
        targetClusterCount: number;
        isSmallGroup: boolean;
        isEdgeCase: boolean;
    }
): void {
    const { participantCount, targetClusterCount, isSmallGroup, isEdgeCase } = config;
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

    // 3. 중복 ID 체크 - AI가 잘못 배정한 경우 에러 발생
    if (duplicateIds.size > 0) {
        errors.push(`중복 배정된 ID: ${Array.from(duplicateIds).join(', ')}`);
    }

    // 4. 누락된 ID 체크 - AI가 누락한 경우 에러 발생
    const missingIds = [...submittedIds].filter(id => !assignedIds.has(id));
    if (missingIds.length > 0) {
        errors.push(`누락된 참가자 ID: ${missingIds.join(', ')}`);
    }

    // 5. 존재하지 않는 ID 체크
    const invalidIds = [...assignedIds].filter(id => !submittedIds.has(id));
    if (invalidIds.length > 0) {
        errors.push(`존재하지 않는 ID: ${invalidIds.join(', ')}`);
    }

    // 6. 클러스터 크기 검증
    const ALLOWED_MIN_SIZE = isEdgeCase ? 4 : 1;
    const invalidSizeClusters = clusters.filter(
        c => c.memberIds.length < ALLOWED_MIN_SIZE ||
            c.memberIds.length > CLUSTER_CONFIG.MAX_SIZE
    );
    if (invalidSizeClusters.length > 0) {
        errors.push(
            `크기 제약 위반 클러스터: ${invalidSizeClusters.map(c =>
                `${c.id}(${c.memberIds.length}명)`
            ).join(', ')} (허용 범위: ${ALLOWED_MIN_SIZE}-${CLUSTER_CONFIG.MAX_SIZE}명)`
        );
    }

    // 6-1. 🚨 단일 성별 클러스터 검증 (절대 금지)
    // 클러스터가 2개 이상이고, 전체 참가자 중 남/여가 모두 있는 경우에만 검증
    const totalMales = submissions.filter(s => s.gender === 'male').length;
    const totalFemales = submissions.filter(s => s.gender === 'female').length;
    const hasBothGenders = totalMales > 0 && totalFemales > 0;

    if (hasBothGenders && clusters.length >= 2) {
        for (const cluster of clusters) {
            let maleCount = 0;
            let femaleCount = 0;

            for (const memberId of cluster.memberIds) {
                const submission = submissions.find(s => s.participantId === memberId);
                if (submission?.gender === 'male') maleCount++;
                else if (submission?.gender === 'female') femaleCount++;
            }

            // 단일 성별 클러스터 발견 시 에러
            if (maleCount === 0 && femaleCount > 0) {
                errors.push(
                    `🚨 단일 성별 클러스터 금지 위반: "${cluster.name}" (여성만 ${femaleCount}명, 남성 0명)`
                );
            } else if (femaleCount === 0 && maleCount > 0) {
                errors.push(
                    `🚨 단일 성별 클러스터 금지 위반: "${cluster.name}" (남성만 ${maleCount}명, 여성 0명)`
                );
            }
        }
    }

    // 7. 클러스터 개수 검증
    if (isSmallGroup) {
        if (clusters.length !== 1) {
            errors.push(`소규모 그룹은 1개 클러스터만 가능: 실제 ${clusters.length}개`);
        }
    } else if (isEdgeCase) {
        if (clusters.length !== 2) {
            errors.push(`8/9명은 2개 클러스터만 가능: 실제 ${clusters.length}개`);
        }
    } else {
        if (Math.abs(clusters.length - targetClusterCount) > 1) {
            errors.push(`클러스터 개수 불일치: 목표 ${targetClusterCount}개, 실제 ${clusters.length}개`);
        }
    }

    // 8. 검증 실패 시 에러
    if (errors.length > 0) {
        logger.error(
            `[AI Clustering] 검증 실패:\n` +
            errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
        );
        throw new Error(`AI 클러스터링 검증 실패: ${errors.length}개 오류 발견`);
    }
}
