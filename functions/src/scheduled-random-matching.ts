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
import {
  matchParticipantsRandomly,
  type ParticipantWithSubmissionCount,
} from "./lib/random-matching";

// Seoul Firestore instance
function getSeoulDB() {
  return admin.firestore();
}

// Environment parameters
const cohortIdParam = defineString("DEFAULT_COHORT_ID", {
  description: "Default cohort ID for scheduled matching",
  default: "2",
});

const internalSecretParam = defineString("INTERNAL_SERVICE_SECRET", {
  description: "Internal secret for scheduled function authentication",
});

/**
 * 스케줄된 랜덤 매칭 (매일 오후 2시)
 *
 * 매일 오후 2시 (KST)에 자동으로 실행
 * 1. 어제 인증한 참가자 조회
 * 2. 랜덤 매칭 실행
 * 3. Firestore에 저장
 * 4. 푸시 알림 전송
 */
export const scheduledRandomMatching = onSchedule(
  {
    schedule: "0 14 * * *", // 매일 오후 2시 (KST)
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

      // 3. profileUnlockDate 체크
      const cohortDoc = activeCohortsSnapshot.empty
        ? await db.collection("cohorts").doc(cohortId).get()
        : activeCohortsSnapshot.docs[0];

      const cohortData = cohortDoc.data();
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

      // 5. 어제 인증 완료한 참가자 조회 (공급자: providers)
      // draft 제외, pending + approved 포함 (기존 시스템과 동일)
      const submissionsSnapshot = await db
        .collection("reading_submissions")
        .where("submissionDate", "==", yesterdayStr)
        .where("status", "in", ["pending", "approved"]) // draft만 제외
        .get();

      if (submissionsSnapshot.empty) {
        logger.warn(`No submitted (pending/approved) for ${yesterdayStr}`);
        return;
      }

      const providerIds = Array.from(
        new Set(submissionsSnapshot.docs.map(doc => doc.data().participantId))
      );

      logger.info(`${providerIds.length} participants submitted (providers)`);

      // 6. 전체 cohort 멤버 조회 (수요자: viewers)
      // 관리자/고스트 계정 필터링
      const allParticipantsSnapshot = await db
        .collection("participants")
        .where("cohortId", "==", cohortId)
        .get();

      const viewers: ParticipantWithSubmissionCount[] = [];
      const providers: ParticipantWithSubmissionCount[] = [];

      for (const participantDoc of allParticipantsSnapshot.docs) {
        const participantData = participantDoc.data();

        // 관리자/고스트 필터링 (기존 AI 매칭과 동일)
        if (
          participantData.isSuperAdmin === true ||
          participantData.isAdministrator === true ||
          participantData.isGhost === true
        ) {
          logger.info(`Skipping filtered participant: ${participantData.name} (admin/ghost)`);
          continue;
        }

        // 누적 인증 횟수 계산
        const allSubmissionsSnapshot = await db
          .collection("reading_submissions")
          .where("participantId", "==", participantDoc.id)
          .where("status", "==", "approved")
          .get();

        // 중복 제거: submissionDate 기준
        const uniqueDates = new Set(
          allSubmissionsSnapshot.docs.map(doc => doc.data().submissionDate)
        );

        const participant: ParticipantWithSubmissionCount = {
          id: participantDoc.id,
          name: participantData.name || 'Unknown',
          gender: participantData.gender,
          submissionCount: uniqueDates.size,
        };

        // 전체 멤버는 수요자(viewers)
        viewers.push(participant);

        // 어제 인증한 사람은 공급자(providers)
        if (providerIds.includes(participantDoc.id)) {
          providers.push(participant);
        }
      }

      logger.info(`Loaded ${viewers.length} viewers, ${providers.length} providers`);

      // 7. 최근 3일간 매칭 이력 조회
      const recent3Days: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const date = format(subDays(yesterday, i), 'yyyy-MM-dd');
        recent3Days.push(date);
      }

      const recentMatchings: Record<string, string[]> = {};

      for (const date of recent3Days) {
        const dailyFeatured = cohortData?.dailyFeaturedParticipants?.[date];
        if (!dailyFeatured?.assignments) continue;

        for (const [participantId, assignment] of Object.entries(
          dailyFeatured.assignments as Record<string, any>
        )) {
          if (!recentMatchings[participantId]) {
            recentMatchings[participantId] = [];
          }

          // v2.0: assigned 필드
          if (assignment.assigned) {
            recentMatchings[participantId].push(...assignment.assigned);
          }

          // v1.0: similar + opposite (레거시 호환)
          if (assignment.similar) {
            recentMatchings[participantId].push(...assignment.similar);
          }
          if (assignment.opposite) {
            recentMatchings[participantId].push(...assignment.opposite);
          }
        }
      }

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

      // 10. 푸시 알림 전송
      logger.info(`Sending matching notifications`);

      const functionsUrl = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/sendMatchingNotifications`;

      const notificationResponse = await fetch(functionsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": internalSecret,
        },
        body: JSON.stringify({
          cohortId,
          date: yesterdayStr,
        }),
      });

      if (!notificationResponse.ok) {
        const error = await notificationResponse.json();
        logger.error(`Notification failed: ${notificationResponse.status}`, error);
      } else {
        const result = await notificationResponse.json();
        logger.info(`✅ Notifications sent: ${result.recipientCount || 'unknown'} recipients`);
      }

      logger.info(`✅ Random matching completed`, {
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
