/**
 * 스케줄된 클러스터 매칭 함수 (v3.0)
 *
 * 기존 랜덤 매칭(v2.0)을 대체하는 AI 클러스터 매칭 시스템
 * - 매일 어제 인증한 참가자들만 클러스터링
 * - AI가 감상평 + 답변 분석 (책 제목 무시)
 * - 클러스터 크기: 5-7명
 * - 클러스터 내 전원 매칭
 *
 * @version 3.0.0
 * @date 2025-11-15
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";
import { subDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { logger } from "./lib/logger";
import { getSeoulDB } from "./lib/db-helper";
import {
  matchParticipantsWithClusters,
  type DailySubmission,
} from "./lib/cluster-matching";

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
    logger.info("🎯 Scheduled cluster matching started (v3.0)");

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

      // 3-1. endDate 체크: 종료된 cohort 스킵
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

      // 5. 어제 인증한 참가자들의 감상평 + 답변 조회
      const submissionsSnapshot = await db
        .collection('reading_submissions')
        .where('cohortId', '==', cohortId)
        .where('submissionDate', '==', yesterdayStr)
        .where('status', '==', 'approved')
        .get();

      if (submissionsSnapshot.empty) {
        logger.warn(`No submissions for ${yesterdayStr}, skipping matching`);
        return;
      }

      logger.info(`Found ${submissionsSnapshot.size} submissions for ${yesterdayStr}`);

      // 6. 참가자 정보 조회 (배치 처리)
      const participantIds = Array.from(
        new Set(submissionsSnapshot.docs.map(doc => doc.data().participantId))
      );

      const participantsMap = new Map<string, { name: string; gender?: string }>();

      // Firestore 'in' 쿼리 제한: 최대 10개씩 배치
      const BATCH_SIZE = 10;
      for (let i = 0; i < participantIds.length; i += BATCH_SIZE) {
        const batch = participantIds.slice(i, i + BATCH_SIZE);
        const participantsSnapshot = await db
          .collection('participants')
          .where(admin.firestore.FieldPath.documentId(), 'in', batch)
          .get();

        participantsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          participantsMap.set(doc.id, {
            name: data.name || 'Unknown',
            gender: data.gender
          });
        });
      }

      // 7. DailySubmission 형태로 변환
      const dailySubmissions: DailySubmission[] = submissionsSnapshot.docs.map(doc => {
        const data = doc.data();
        const participant = participantsMap.get(data.participantId);

        return {
          participantId: data.participantId,
          participantName: participant?.name || 'Unknown',
          gender: participant?.gender,
          review: data.review || '',
          dailyQuestion: data.dailyQuestion || '',
          dailyAnswer: data.dailyAnswer || ''
        };
      });

      // 8. 클러스터 매칭 실행
      logger.info(`Starting cluster matching: ${dailySubmissions.length} participants`);

      const matchingResult = await matchParticipantsWithClusters(dailySubmissions);

      logger.info(
        `Cluster matching completed: ` +
        `${Object.keys(matchingResult.clusters).length}개 클러스터, ` +
        `${Object.keys(matchingResult.assignments).length}명 할당`
      );

      if (matchingResult.validation?.errors.length) {
        logger.error(`Validation errors: ${matchingResult.validation.errors.join(', ')}`);
      }

      if (matchingResult.validation?.warnings.length) {
        logger.warn(`Validation warnings: ${matchingResult.validation.warnings.join(', ')}`);
      }

      // 9. Firestore에 저장 (Transaction)
      const matchingEntry = {
        clusters: matchingResult.clusters,
        assignments: matchingResult.assignments,
        matchingVersion: 'cluster' as const,
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

      // 10. matching_results 백업
      const confirmData = {
        cohortId,
        date: yesterdayStr,
        matching: matchingEntry,
        totalParticipants: dailySubmissions.length,
        clusterCount: Object.keys(matchingResult.clusters).length,
        confirmedAt: admin.firestore.Timestamp.now(),
        confirmedBy: "scheduled_cluster_matching",
        validationErrors: matchingResult.validation?.errors || [],
        validationWarnings: matchingResult.validation?.warnings || [],
      };

      const confirmRef = db
        .collection("matching_results")
        .doc(`${cohortId}-${yesterdayStr}`);

      await confirmRef.set(confirmData);

      logger.info(`✅ Matching saved to Firestore`);

      logger.info(`✅ Cluster matching completed (v3.0)`, {
        cohortId,
        date: yesterdayStr,
        participants: dailySubmissions.length,
        clusters: Object.keys(matchingResult.clusters).length,
        matchingVersion: 'cluster',
      });
    } catch (error) {
      logger.error("❌ Cluster matching failed", error as Error);
      throw error;
    }
  }
);
