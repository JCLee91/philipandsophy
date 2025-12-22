import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { format, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { logger } from "./lib/logger";
import { getDefaultDb } from "./lib/db-helper";
import { matchParticipantsWithClusters } from './lib/cluster/index';
import { fetchDailySubmissions, fetchRecentCategories } from './lib/cluster/data';

const internalSecretParam = defineString("INTERNAL_SERVICE_SECRET", {
    description: "Internal secret for scheduled function authentication",
});

/**
 * 수동 클러스터 매칭 실행 (HTTP)
 * 
 * 관리자 페이지에서 "매칭 실행" 버튼 클릭 시 호출됨
 * - 스케줄러와 동일한 로직 사용
 * - 결과만 반환하고 DB 저장은 별도 confirm API에서 처리 (Preview 모드)
 */
export const manualClusterMatching = onRequest(
    {
        region: "asia-northeast3",
        memory: "1GiB",
        timeoutSeconds: 540,
        cors: true, // CORS 허용
    },
    async (req, res) => {
        // 1. 인증 확인 (Internal Secret or Admin Auth)
        // 여기서는 간단히 Internal Secret만 확인하거나, 
        // 실제로는 API Gateway 역할을 하는 Next.js API Route에서 인증을 거쳐서 오므로
        // 헤더의 Secret을 확인하는 것이 안전함.

        const internalSecret = internalSecretParam.value();
        const requestSecret = req.headers['x-internal-secret'] as string;
        const authHeader = req.headers.authorization;

        // Secret이 없거나 불일치하고, Auth 헤더도 없으면 거부
        if ((!internalSecret || requestSecret !== internalSecret) && !authHeader) {
            logger.warn("Unauthorized access attempt to manualClusterMatching");
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        try {
            const { cohortId, date } = req.body;

            if (!cohortId) {
                res.status(400).json({ error: "cohortId is required" });
                return;
            }

            const db = getDefaultDb();

            // 2. 날짜 결정
            // date 파라미터가 있으면 그 날짜 사용, 없으면 '어제' (스케줄러와 동일)
            let targetDate = date;
            if (!targetDate) {
                const now = new Date();
                const kstNow = toZonedTime(now, 'Asia/Seoul');
                const yesterday = subDays(kstNow, 1);
                targetDate = format(yesterday, 'yyyy-MM-dd');
            }

            logger.info(`🎯 Manual cluster matching started for Cohort ${cohortId}, Date: ${targetDate}`);

            // 3. 인증 데이터 조회 (공통 함수 사용)
            const dailySubmissions = await fetchDailySubmissions(db, cohortId, targetDate);

            if (dailySubmissions.length === 0) {
                logger.warn(`No submissions for ${targetDate} (Cohort ${cohortId})`);
                res.status(404).json({
                    message: `No submissions found for date ${targetDate}`,
                    totalParticipants: 0
                });
                return;
            }

            // 4. 최근 카테고리 조회 (다양성 보장)
            const recentCategories = await fetchRecentCategories(db, cohortId, targetDate, 3);

            // 5. 클러스터 매칭 실행
            const matchingResult = await matchParticipantsWithClusters(dailySubmissions, targetDate, recentCategories);

            // 6. 결과 반환 (DB 저장 안함 - Preview)
            res.status(200).json({
                success: true,
                date: targetDate,
                totalParticipants: dailySubmissions.length,
                matching: {
                    clusters: matchingResult.clusters,
                    assignments: matchingResult.assignments,
                    matchingVersion: 'cluster',
                }
            });

        } catch (error) {
            logger.error("❌ Manual cluster matching failed", error as Error);
            res.status(500).json({
                error: "Internal Server Error",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }
);
