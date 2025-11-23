import * as admin from "firebase-admin";
import { DailySubmission } from './types';
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

    // 3. DailySubmission 변환
    const dailySubmissions: DailySubmission[] = submissionsSnapshot.docs.map(doc => {
        const data = doc.data();
        const participant = participantsMap.get(data.participantId);

        return {
            participantId: data.participantId,
            participantName: participant?.name || 'Unknown',
            gender: participant?.gender,
            bookTitle: data.bookTitle || '제목 없음',
            bookAuthor: data.bookAuthor,
            review: data.review || '',
            dailyQuestion: data.dailyQuestion || '',
            dailyAnswer: data.dailyAnswer || ''
        };
    });

    return dailySubmissions;
}
