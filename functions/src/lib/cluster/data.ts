import * as admin from "firebase-admin";
import { subDays, format } from "date-fns";
import { DailySubmission, Cluster } from './types';
import { logger } from '../logger';

/**
 * 특정 날짜의 인증 데이터와 참가자 정보를 조회하여 DailySubmission 형태로 반환
 * 
 * @param db Firestore 인스턴스
 * @param cohortId 기수 ID
 * @param dateStr 조회할 날짜 (YYYY-MM-DD)
 * @returns DailySubmission 배열
 */
export async function fetchDailySubmissions(
    db: admin.firestore.Firestore,
    cohortId: string,
    dateStr: string
): Promise<DailySubmission[]> {
    // 1. 인증 데이터 조회
    const submissionsSnapshot = await db
        .collection('reading_submissions')
        .where('cohortId', '==', cohortId)
        .where('submissionDate', '==', dateStr)
        .where('status', '==', 'approved')
        .get();

    if (submissionsSnapshot.empty) {
        logger.warn(`No submissions for ${dateStr} (Cohort ${cohortId})`);
        return [];
    }

    logger.info(`Found ${submissionsSnapshot.size} submissions for ${dateStr} (Cohort ${cohortId})`);

    // 2. 참가자 정보 조회 (배치 처리)
    const participantIds = Array.from(
        new Set(submissionsSnapshot.docs.map(doc => doc.data().participantId))
    );

    const participantsMap = new Map<string, { name: string; gender?: string }>();
    const BATCH_SIZE = 30;

    for (let i = 0; i < participantIds.length; i += BATCH_SIZE) {
        const batch = participantIds.slice(i, i + BATCH_SIZE);
        const participantsSnapshot = await db
            .collection('participants')
            .where(admin.firestore.FieldPath.documentId(), 'in', batch)
            .get();

        participantsSnapshot.docs.forEach(pDoc => {
            const pData = pDoc.data();
            participantsMap.set(pDoc.id, {
                name: pData.name || 'Unknown',
                gender: pData.gender
            });
        });
    }

    // 3. DailySubmission 변환 및 중복 제거
    // Map을 사용하여 participantId 별로 가장 최신의 제출물(또는 DB 순서상 마지막) 하나만 유지
    const submissionsMap = new Map<string, DailySubmission>();

    submissionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const participant = participantsMap.get(data.participantId);

        const submission: DailySubmission = {
            participantId: data.participantId,
            participantName: participant?.name || 'Unknown',
            gender: participant?.gender,
            bookTitle: data.bookTitle || '제목 없음',
            bookAuthor: data.bookAuthor,
            review: data.review || '',
            dailyQuestion: data.dailyQuestion || '',
            dailyAnswer: data.dailyAnswer || ''
        };

        // 이미 존재하는 경우 덮어쓰기 (Firestore 쿼리 결과 순서에 따라 달라짐, 보통 최신이 뒤에 오거나 생성순)
        // 명시적인 순서가 필요하면 쿼리에 orderBy를 추가해야 함
        submissionsMap.set(data.participantId, submission);
    });

    const uniqueSubmissions = Array.from(submissionsMap.values());

    if (submissionsSnapshot.size !== uniqueSubmissions.length) {
        logger.info(
            `[Deduplication] Filtered duplicate submissions: ` +
            `${submissionsSnapshot.size} docs → ${uniqueSubmissions.length} unique participants`
        );
    }

    return uniqueSubmissions;
}

/**
 * 최근 N일간의 클러스터 카테고리 조회 (다양성 보장용)
 * 
 * @param db Firestore 인스턴스
 * @param cohortId 기수 ID
 * @param targetDateStr 타겟 날짜 (YYYY-MM-DD) - 이 날짜 이전 N일간 조회
 * @param days 조회할 일수 (기본값: 3)
 * @returns 최근 사용된 카테고리 배열 (중복 제거)
 */
export async function fetchRecentCategories(
    db: admin.firestore.Firestore,
    cohortId: string,
    targetDateStr: string,
    days: number = 3
): Promise<string[]> {
    try {
        const cohortRef = db.collection('cohorts').doc(cohortId);
        const cohortDoc = await cohortRef.get();

        if (!cohortDoc.exists) {
            logger.warn(`Cohort ${cohortId} not found for recent categories lookup`);
            return [];
        }

        const cohortData = cohortDoc.data();
        const dailyFeaturedParticipants = cohortData?.dailyFeaturedParticipants || {};

        // 타겟 날짜 기준으로 이전 N일간의 날짜 생성
        const targetDate = new Date(targetDateStr);
        const recentDates: string[] = [];
        
        for (let i = 1; i <= days; i++) {
            const prevDate = subDays(targetDate, i);
            recentDates.push(format(prevDate, 'yyyy-MM-dd'));
        }

        logger.info(`[Diversity] Looking up categories for dates: ${recentDates.join(', ')}`);

        // 각 날짜의 클러스터에서 카테고리 추출
        const categories: string[] = [];

        for (const dateStr of recentDates) {
            const matchingEntry = dailyFeaturedParticipants[dateStr];
            
            if (!matchingEntry?.clusters) {
                continue;
            }

            const clusters = matchingEntry.clusters as Record<string, Cluster>;
            
            for (const cluster of Object.values(clusters)) {
                if (cluster.category) {
                    categories.push(cluster.category);
                }
            }
        }

        // 중복 제거 (순서 유지)
        const uniqueCategories = [...new Set(categories)];

        logger.info(`[Diversity] Found recent categories: [${uniqueCategories.join(', ')}]`);

        return uniqueCategories;
    } catch (error) {
        logger.error(`[Diversity] Error fetching recent categories:`, error as Error);
        return []; // 에러 시 빈 배열 반환 (다양성 가이드 없이 진행)
    }
}
