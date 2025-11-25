/**
 * 스케줄된 클러스터 매칭 함수 (v4.0)
 *
 * 기존 랜덤 매칭(v2.0)을 대체하는 AI 클러스터 매칭 시스템
 * - 매일 어제 인증한 참가자들만 클러스터링
 * - AI가 감상평 + 답변 분석 (책 제목 무시)
 * - 데이터 기반 동적 축 선택 (가치관, 감정, 관심사 등)
 * - 다양성 보장: 최근 3일 카테고리와 다른 축 우선 시도
 * - 클러스터 크기: 5-7명
 * - 클러스터 내 전원 매칭
 *
 * @version 4.0.0
 * @date 2025-11-25
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";
import { subDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { logger } from "./lib/logger";
import { getSeoulDB } from "./lib/db-helper";
import { matchParticipantsWithClusters } from './lib/cluster/index';
import { fetchDailySubmissions, fetchRecentCategories } from './lib/cluster/data';

// Environment parameters
const cohortIdParam = defineString("DEFAULT_COHORT_ID", {
  description: "Default cohort ID for scheduled matching",
  default: "2",
});

const internalSecretParam = defineString("INTERNAL_SERVICE_SECRET", {
  description: "Internal secret for scheduled function authentication",
});

/**
 * 스케줄된 클러스터 매칭 (매일 새벽 2시)
 *
 * 매일 새벽 2시 (KST)에 자동으로 실행
 * 1. 어제 인증한 참가자의 감상평 + 답변 조회
 *    - 비즈니스 로직: 어제 00:00 ~ 오늘 02:00 까지의 인증은 이미 '어제' 날짜로 저장되어 있음 (createSubmission 참조)
 * 2. AI 클러스터 생성
 * 3. 클러스터 내 매칭
 * 4. Firestore에 저장
 */
export const scheduledClusterMatching = onSchedule(
  {
    schedule: "0 2 * * *", // 매일 새벽 2시 (KST)
    timeZone: "Asia/Seoul",
    timeoutSeconds: 540, // 9분
    memory: "1GiB",
    region: "asia-northeast3", // Seoul
  },
  async (event) => {
    logger.info("🎯 Scheduled cluster matching started (v4.0)");

    try {
      // 1. 환경 설정
      const internalSecret = internalSecretParam.value();

      if (!internalSecret) {
        logger.error("INTERNAL_SERVICE_SECRET is not set; aborting");
        return;
      }

      const db = getSeoulDB();

      // 2. 날짜 계산 (KST)
      // 실행 시점: 11월 24일 02:00
      // 타겟 날짜: 11월 23일 (yesterday)
      const now = new Date();
      const kstNow = toZonedTime(now, 'Asia/Seoul');
      const yesterday = subDays(kstNow, 1);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd'); // "2025-11-23"
      const todayStr = format(kstNow, 'yyyy-MM-dd');       // "2025-11-24" (참고용)

      logger.info(`Matching target date: ${yesterdayStr}`);

      // 3. 활성 cohort 조회 (전체)
      // 기존 limit(1) 제거하여 모든 활성 기수 처리
      const activeCohortsSnapshot = await db
        .collection("cohorts")
        .where("isActive", "==", true)
        .get();

      if (activeCohortsSnapshot.empty) {
        logger.info("No active cohorts found.");
        return;
      }

      logger.info(`Found ${activeCohortsSnapshot.size} active cohorts.`);

      // 4. 각 Cohort별로 순차 처리
      for (const cohortDoc of activeCohortsSnapshot.docs) {
        const cohortId = cohortDoc.id;
        const cohortData = cohortDoc.data();

        try {
          logger.info(`Processing cohort: ${cohortId}`);

          // 4-1. endDate 체크
          if (cohortData?.endDate) {
            if (yesterdayStr > cohortData.endDate) {
              logger.info(`Cohort ${cohortId} ended (${cohortData.endDate}), skipping matching`);
              continue;
            }
          }

          // 4-2. profileUnlockDate 체크
          const profileUnlockDate = cohortData?.profileUnlockDate;
          if (profileUnlockDate) {
            if (todayStr >= profileUnlockDate) {
              logger.info(`Profile unlock date reached (${profileUnlockDate}), skipping`);
              continue;
            }
          }

          // 4-3. useClusterMatching 체크
          const useClusterMatching = cohortData?.useClusterMatching === true;
          if (!useClusterMatching) {
            logger.info(`Cohort ${cohortId} not using cluster matching (v2.0), skipping`);
            continue;
          }

          logger.info(`✅ Cohort ${cohortId} uses cluster matching (v3.0)`);

          // 5. 인증 데이터 조회 (공통 함수 사용)
          const dailySubmissions = await fetchDailySubmissions(db, cohortId, yesterdayStr);

          if (dailySubmissions.length === 0) {
            logger.warn(`No submissions for ${yesterdayStr}, skipping matching (Cohort ${cohortId})`);
            continue;
          }

          // 8. 최근 카테고리 조회 (다양성 보장)
          const recentCategories = await fetchRecentCategories(db, cohortId, yesterdayStr, 3);

          // 9. 클러스터 매칭 실행
          logger.info(`Starting cluster matching for Cohort ${cohortId}: ${dailySubmissions.length} participants`);

          const matchingResult = await matchParticipantsWithClusters(dailySubmissions, yesterdayStr, recentCategories);

          logger.info(
            `Cluster matching completed for Cohort ${cohortId}: ` +
            `${Object.keys(matchingResult.clusters).length} clusters, ` +
            `${Object.keys(matchingResult.assignments).length} assignments`
          );

          // 10. Firestore 저장 (Transaction)
          const matchingEntry = {
            clusters: matchingResult.clusters,
            assignments: matchingResult.assignments,
            matchingVersion: 'cluster' as const,
          };

          const cohortRef = db.collection("cohorts").doc(cohortId);

          await db.runTransaction(async (transaction) => {
            const currentDoc = await transaction.get(cohortRef);
            if (!currentDoc.exists) throw new Error(`Cohort ${cohortId} not found`);

            const currentData = currentDoc.data();
            const dailyFeaturedParticipants = currentData?.dailyFeaturedParticipants || {};

            dailyFeaturedParticipants[yesterdayStr] = matchingEntry;

            transaction.update(cohortRef, {
              dailyFeaturedParticipants,
              updatedAt: admin.firestore.Timestamp.now(),
            });
          });

          logger.info(`✅ Updated dailyFeaturedParticipants for ${yesterdayStr} (Cohort ${cohortId})`);

          // 11. 백업 저장
          const confirmRef = db
            .collection("matching_results")
            .doc(`${cohortId}-${yesterdayStr}`);

          await confirmRef.set({
            cohortId,
            date: yesterdayStr,
            matching: matchingEntry,
            totalParticipants: dailySubmissions.length,
            clusterCount: Object.keys(matchingResult.clusters).length,
            confirmedAt: admin.firestore.Timestamp.now(),
            confirmedBy: "scheduled_cluster_matching",
          });

          logger.info(`✅ Matching saved to matching_results (Cohort ${cohortId})`);

        } catch (cohortError) {
          logger.error(`❌ Error processing cohort ${cohortId}`, cohortError as Error);
          // Continue to next cohort
        }
      }

      logger.info("✅ Scheduled cluster matching finished for all cohorts.");

    } catch (error) {
      logger.error("❌ Cluster matching fatal error", error as Error);
      throw error;
    }
  }
);
