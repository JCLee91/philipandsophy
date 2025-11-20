/**
 * 스케줄된 랜덤 매칭 함수 (v2.0)
 *
 * 기존 AI 매칭을 대체하는 랜덤 매칭 시스템
 * - AI 분석 제거
 * - 누적 인증 기반 프로필북 개수
 * - 성별 균형 우선
 * - 최근 3일 중복 방지
 *
 * @version 2.0.0
 * @date 2025-11-07
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";
import { subDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { logger } from "./lib/logger";
import { getSeoulDB } from "./lib/db-helper";
import {
  matchParticipantsRandomly,
  type ParticipantWithSubmissionCount,
} from "./lib/random-matching.deprecated";
import {
  loadProviders,
  loadRecentMatchings,
} from "./lib/matching-inputs";

// Environment parameters
const cohortIdParam = defineString("DEFAULT_COHORT_ID", {
  description: "Default cohort ID for scheduled matching",
  default: "2",
});

const internalSecretParam = defineString("INTERNAL_SERVICE_SECRET", {
  description: "Internal secret for scheduled function authentication",
});

/**
 * 스케줄된 랜덤 매칭 (매일 새벽 2시)
 *
 * 매일 새벽 2시 (KST)에 자동으로 실행
 * 1. 어제 인증한 참가자 조회
 * 2. 랜덤 매칭 실행
 * 3. Firestore에 저장 (푸시 알림은 스케줄 실행 시 중단)
 */
export const scheduledRandomMatching = onSchedule(
  {
    schedule: "0 2 * * *", // 매일 새벽 2시 (KST)
    timeZone: "Asia/Seoul",
    timeoutSeconds: 540, // 9분
    memory: "1GiB",
    region: "asia-northeast3", // Seoul
  },
  async (event) => {
    logger.info("🎲 Scheduled random matching started");

    try {
      // 1. 환경 설정
      const internalSecret = internalSecretParam.value();

      if (!internalSecret) {
        logger.error("INTERNAL_SERVICE_SECRET is not set; aborting");
        return;
      }

      // 2. 활성 cohort 조회
      const db = getSeoulDB();
      const activeCohortsSnapshot = await db
        .collection("cohorts")
        .where("isActive", "==", true)
        .limit(1)
        .get();

      const cohortId = activeCohortsSnapshot.empty
        ? cohortIdParam.value()
        : activeCohortsSnapshot.docs[0].id;

      logger.info(`Active cohort: ${cohortId}`);

      // 3. Cohort 데이터 조회
      const cohortDoc = activeCohortsSnapshot.empty
        ? await db.collection("cohorts").doc(cohortId).get()
        : activeCohortsSnapshot.docs[0];

      const cohortData = cohortDoc.data();

      // 3-1. endDate 체크: 종료된 cohort 스킵 (자동 제외)
      if (cohortData?.endDate) {
        const today = new Date().toLocaleString('en-CA', {
          timeZone: 'Asia/Seoul'
        }).split(',')[0]; // YYYY-MM-DD

        if (today > cohortData.endDate) {
          logger.info(`Cohort ${cohortId} ended (${cohortData.endDate}), skipping matching`);
          return;
        }
      }

      // 3-2. profileUnlockDate 체크: 전체 공개 모드 스킵
      const profileUnlockDate = cohortData?.profileUnlockDate;

      if (profileUnlockDate) {
        const today = new Date().toLocaleString('en-CA', {
          timeZone: 'Asia/Seoul'
        }).split(',')[0];

        if (today >= profileUnlockDate) {
          logger.info(`Profile unlock date reached (${profileUnlockDate}), skipping`);
          return;
        }
      }

      // 4. 어제 날짜 계산 (KST)
      const now = new Date();
      const kstNow = toZonedTime(now, 'Asia/Seoul');
      const yesterday = subDays(kstNow, 1);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

      logger.info(`Matching date: ${yesterdayStr}`);

      // 5. Providers와 Viewers 로드 (Helper 사용)
      const { providers, viewers } = await loadProviders(
        db,
        cohortId,
        yesterdayStr
      );

      if (providers.length === 0) {
        logger.warn(`No providers for ${yesterdayStr}`);
        return;
      }

      logger.info(`Loaded ${providers.length} providers, ${viewers.length} viewers`);

      // 6. 최근 1일 매칭 이력 로드 (어제만 중복 방지)
      const recentMatchings = await loadRecentMatchings(db, cohortId, yesterdayStr, 1);

      logger.info(`Recent matchings loaded for ${Object.keys(recentMatchings).length} viewers`);

      // 8. 랜덤 매칭 실행
      logger.info(`Starting random matching: ${viewers.length} viewers, ${providers.length} providers`);

      const matchingResult = await matchParticipantsRandomly({
        providers, // 어제 인증한 사람들 (프로필북 공급)
        viewers, // 전체 cohort 멤버 (프로필북 수요)
        recentMatchings,
      });

      logger.info(`Random matching completed: ${Object.keys(matchingResult.assignments).length} assignments`);

      if (matchingResult.validation?.errors.length) {
        logger.error(`Validation errors: ${matchingResult.validation.errors.join(', ')}`);
      }

      if (matchingResult.validation?.warnings.length) {
        logger.warn(`Validation warnings: ${matchingResult.validation.warnings.join(', ')}`);
      }

      // 9. Firestore에 저장 (Transaction)
      const matchingEntry = {
        assignments: matchingResult.assignments,
        matchingVersion: 'random' as const,
      };

      const cohortRef = db.collection("cohorts").doc(cohortId);

      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(cohortRef);

        if (!doc.exists) {
          throw new Error(`Cohort ${cohortId} not found`);
        }

        const data = doc.data();
        const dailyFeaturedParticipants = data?.dailyFeaturedParticipants || {};

        // Race condition 방지
        if (dailyFeaturedParticipants[yesterdayStr]?.assignments) {
          logger.warn(`Matching for ${yesterdayStr} already exists, skipping`);
          return;
        }

        dailyFeaturedParticipants[yesterdayStr] = matchingEntry;

        transaction.update(cohortRef, {
          dailyFeaturedParticipants,
          updatedAt: admin.firestore.Timestamp.now(),
        });

        logger.info(`✅ Updated dailyFeaturedParticipants for ${yesterdayStr}`);
      });

      // matching_results 백업
      const confirmData = {
        cohortId,
        date: yesterdayStr,
        matching: matchingEntry,
        totalParticipants: viewers.length,
        providersCount: providers.length,
        confirmedAt: admin.firestore.Timestamp.now(),
        confirmedBy: "scheduled_random_matching",
        validationErrors: matchingResult.validation?.errors || [],
        validationWarnings: matchingResult.validation?.warnings || [],
      };

      const confirmRef = db
        .collection("matching_results")
        .doc(`${cohortId}-${yesterdayStr}`);

      await confirmRef.set(confirmData);

      logger.info(`✅ Matching saved to Firestore`);

      logger.info(`✅ Random matching completed (notifications skipped for scheduled run)`, {
        cohortId,
        date: yesterdayStr,
        viewers: viewers.length,
        providers: providers.length,
        matchingVersion: 'random',
      });
    } catch (error) {
      logger.error("❌ Random matching failed", error as Error);
      throw error;
    }
  }
);
