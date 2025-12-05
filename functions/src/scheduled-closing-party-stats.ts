/**
 * 클로징 파티 통계 자동 계산
 *
 * 매일 새벽 3시에 실행되어 프로그램 종료된 코호트의 통계를 계산합니다.
 * - 프로그램 endDate의 다음날 새벽 3시에 계산
 * - 이미 계산된 코호트는 스킵
 *
 * @version 1.0.0
 * @date 2025-12-05
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { format, subDays, parseISO, isEqual } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { logger } from './lib/logger';
import { getSeoulDB } from './lib/db-helper';
import { calculateClosingPartyStats } from './lib/closing-party/index';

/**
 * 스케줄된 클로징 파티 통계 계산 (매일 새벽 3시)
 *
 * 실행 조건:
 * - 매일 새벽 3시 실행 (KST)
 * - 어제가 endDate인 코호트 (프로그램 막 종료)
 * - 아직 통계가 계산되지 않은 코호트
 */
export const scheduledClosingPartyStats = onSchedule(
  {
    schedule: '0 3 * * *', // 매일 새벽 3시 (KST)
    timeZone: 'Asia/Seoul',
    timeoutSeconds: 300, // 5분
    memory: '512MiB',
    region: 'asia-northeast3', // Seoul
  },
  async () => {
    logger.info('🎉 Scheduled closing party stats calculation started');

    try {
      const db = getSeoulDB();

      // 1. 날짜 계산 (KST)
      // 실행 시점: 11월 22일 03:00
      // 어제: 11월 21일 (프로그램 종료일)
      const now = new Date();
      const kstNow = toZonedTime(now, 'Asia/Seoul');
      const yesterday = subDays(kstNow, 1);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

      logger.info(`Checking for cohorts with endDate: ${yesterdayStr}`);

      // 2. 어제 종료된 코호트 조회
      const cohortsSnapshot = await db
        .collection('cohorts')
        .where('endDate', '==', yesterdayStr)
        .get();

      if (cohortsSnapshot.empty) {
        logger.info('No cohorts ended yesterday.');
        return;
      }

      logger.info(`Found ${cohortsSnapshot.size} cohorts ended yesterday.`);

      // 3. 각 코호트별로 처리
      for (const cohortDoc of cohortsSnapshot.docs) {
        const cohortId = cohortDoc.id;
        const cohortData = cohortDoc.data();

        try {
          logger.info(`Processing cohort: ${cohortId} (${cohortData.name})`);

          // 3-1. 이미 계산되었는지 확인
          const existingStats = await db
            .collection('closing_party_stats')
            .doc(cohortId)
            .get();

          if (existingStats.exists) {
            logger.info(`Stats already calculated for cohort ${cohortId}, skipping`);
            continue;
          }

          // 3-2. 통계 계산
          const stats = await calculateClosingPartyStats(db, cohortId, 'scheduled');

          logger.info(
            `✅ Closing party stats calculated for ${cohortData.name}: ` +
              `${stats.totalParticipants} participants, ${stats.totalSubmissions} submissions`
          );
        } catch (cohortError) {
          logger.error(`❌ Error processing cohort ${cohortId}`, cohortError as Error);
          // Continue to next cohort
        }
      }

      logger.info('✅ Scheduled closing party stats calculation finished.');
    } catch (error) {
      logger.error('❌ Closing party stats fatal error', error as Error);
      throw error;
    }
  }
);
