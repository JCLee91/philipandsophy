/**
 * 랜덤 매칭 입력 데이터 수집 Helper
 *
 * Single Source of Truth for data collection
 * manualMatchingPreview와 scheduledMatchingPreview에서 공통 사용
 *
 * @version 1.1.0
 * @date 2025-11-10
 */

import * as admin from "firebase-admin";
import { logger } from "./logger";
import type { ParticipantWithSubmissionCount } from "./random-matching.deprecated";

interface SubmissionData {
  participantId: string;
  participationCode: string;
  submissionDate: string;
  status: string;
}

interface ParticipantData {
  name: string;
  gender?: 'male' | 'female' | 'other';
  cohortId: string;
  participationCode?: string;
  isSuperAdmin?: boolean;
  isAdministrator?: boolean;
  isGhost?: boolean;
}

/**
 * 프로필북 공급자와 수요자 로드
 *
 * @param db Firestore instance
 * @param cohortId 코호트 ID
 * @param targetDate 제출 날짜 (YYYY-MM-DD)
 * @returns { providers, viewers, notSubmittedParticipants }
 */
export async function loadProviders(
  db: admin.firestore.Firestore,
  cohortId: string,
  targetDate: string
): Promise<{
  providers: ParticipantWithSubmissionCount[];
  viewers: ParticipantWithSubmissionCount[];
  notSubmittedParticipants: Array<{ id: string; name: string }>;
}> {
  logger.info("Loading providers and viewers", { cohortId, targetDate });

  // 1. 어제 제출한 참가자 조회 (draft 제외)
  const submissionsSnapshot = await db
    .collection("reading_submissions")
    .where("submissionDate", "==", targetDate)
    .where("status", "!=", "draft")
    .get();

  if (submissionsSnapshot.empty) {
    logger.warn("No submissions found for target date", { targetDate });
    return {
      providers: [],
      viewers: [],
      notSubmittedParticipants: [],
    };
  }

  const providerIdSet = new Set<string>();
  submissionsSnapshot.docs.forEach((doc) => {
    const data = doc.data() as SubmissionData;
    if (data.participantId) {
      providerIdSet.add(data.participantId);
    }
  });

  logger.info(`Found ${providerIdSet.size} providers (submitted yesterday)`);

  // 2. 전체 cohort 참가자 조회
  const allParticipantsSnapshot = await db
    .collection("participants")
    .where("cohortId", "==", cohortId)
    .get();

  if (allParticipantsSnapshot.empty) {
    logger.warn("No participants found in cohort", { cohortId });
    return {
      providers: [],
      viewers: [],
      notSubmittedParticipants: [],
    };
  }

  // 3. 참가자 ID 목록 수집 (cohort 범위로 제한)
  const allParticipantIds: string[] = [];
  const participantDataById = new Map<string, ParticipantData>();

  allParticipantsSnapshot.docs.forEach((doc) => {
    const data = doc.data() as ParticipantData;
    // 슈퍼관리자, 일반관리자만 제외 (고스트는 수요자로 포함)
    if (data.isSuperAdmin || data.isAdministrator) {
      return;
    }
    allParticipantIds.push(doc.id);
    participantDataById.set(doc.id, data);
  });

  logger.info(`Found ${allParticipantIds.length} non-admin participants`);

  // 4. 누적 인증 횟수 계산 (cohort 참가자만, participationCode 고려)
  // ✅ 성능: 전체 컬렉션이 아닌 cohort 참가자만 조회
  const submissionsByParticipant = new Map<string, Set<string>>();

  // Batch 처리 (10개씩)
  const BATCH_SIZE = 10;
  for (let i = 0; i < allParticipantIds.length; i += BATCH_SIZE) {
    const batchIds = allParticipantIds.slice(i, i + BATCH_SIZE);

    const batchSubmissions = await db
      .collection("reading_submissions")
      .where("participantId", "in", batchIds)
      .where("status", "==", "approved")
      .get();

    batchSubmissions.docs.forEach((doc) => {
      const data = doc.data() as SubmissionData;
      const participantId = data.participantId;
      const participationCode = data.participationCode;
      const submissionDate = data.submissionDate;

      if (!participantId || !submissionDate) return;

      // ✅ participationCode 일치 확인 (재참여자 구분)
      const participant = participantDataById.get(participantId);
      if (!participant) return;

      const expectedCode = participant.participationCode || participantId;
      if (participationCode !== expectedCode) {
        // 다른 참여 코드 (이전 기수 등) 제외
        return;
      }

      if (!submissionsByParticipant.has(participantId)) {
        submissionsByParticipant.set(participantId, new Set());
      }
      submissionsByParticipant.get(participantId)!.add(submissionDate);
    });
  }

  logger.info("Submission counts calculated", {
    participantsWithSubmissions: submissionsByParticipant.size,
  });

  // 5. Providers와 Viewers 생성
  const providers: ParticipantWithSubmissionCount[] = [];
  const viewers: ParticipantWithSubmissionCount[] = [];
  const notSubmittedParticipants: Array<{ id: string; name: string }> = [];

  allParticipantIds.forEach((participantId) => {
    const participant = participantDataById.get(participantId);
    if (!participant) return;

    const uniqueDates = submissionsByParticipant.get(participantId) || new Set();
    const submissionCount = uniqueDates.size;

    const participantWithCount: ParticipantWithSubmissionCount = {
      id: participantId,
      name: participant.name || "Unknown",
      gender: participant.gender,
      submissionCount,
    };

    // 모든 일반 참가자는 viewers
    viewers.push(participantWithCount);

    // 어제 제출한 참가자는 providers
    if (providerIdSet.has(participantId)) {
      providers.push(participantWithCount);
    } else {
      notSubmittedParticipants.push({
        id: participantId,
        name: participant.name || "Unknown",
      });
    }
  });

  logger.info("Providers and viewers loaded", {
    providers: providers.length,
    viewers: viewers.length,
    notSubmitted: notSubmittedParticipants.length,
  });

  return {
    providers,
    viewers,
    notSubmittedParticipants,
  };
}

/**
 * 최근 매칭 이력 로드 (중복 방지용)
 *
 * @param db Firestore instance
 * @param cohortId 코호트 ID
 * @param targetDate 기준 날짜 (YYYY-MM-DD)
 * @param days 조회할 과거 일수 (기본 1일)
 * @returns Map<participantId, assignedProfileIds[]>
 */
export async function loadRecentMatchings(
  db: admin.firestore.Firestore,
  cohortId: string,
  targetDate: string,
  days: number = 1
): Promise<Record<string, string[]>> {
  logger.info("Loading recent matchings", { cohortId, targetDate, days });

  // ✅ dailyFeaturedParticipants는 코호트 문서의 맵 필드 (서브컬렉션 아님)
  const cohortDoc = await db.collection("cohorts").doc(cohortId).get();
  if (!cohortDoc.exists) {
    logger.warn("Cohort not found", { cohortId });
    return {};
  }

  const cohortData = cohortDoc.data();
  const dailyFeaturedParticipants = cohortData?.dailyFeaturedParticipants || {};

  const today = new Date(targetDate);
  const recentDates: string[] = [];

  for (let i = 1; i <= days; i++) {
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - i);
    const dateStr = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, "0")}-${String(pastDate.getDate()).padStart(2, "0")}`;
    recentDates.push(dateStr);
  }

  const recentMatchings: Record<string, string[]> = {};

  for (const dateStr of recentDates) {
    const dailyData = dailyFeaturedParticipants[dateStr];
    if (!dailyData?.assignments) continue;

    for (const [viewerId, assignment] of Object.entries(dailyData.assignments)) {
      if (!recentMatchings[viewerId]) {
        recentMatchings[viewerId] = [];
      }

      // v2.0 (assigned) 우선, v1.0 (similar + opposite) fallback
      const assignedIds = (assignment as any).assigned ||
        [
          ...((assignment as any).similar || []),
          ...((assignment as any).opposite || []),
        ];

      if (Array.isArray(assignedIds)) {
        recentMatchings[viewerId].push(...assignedIds);
      }
    }
  }

  logger.info("Recent matchings loaded", {
    participantsWithHistory: Object.keys(recentMatchings).length,
    dateRange: recentDates,
  });

  return recentMatchings;
}
