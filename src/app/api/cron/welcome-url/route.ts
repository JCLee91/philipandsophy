import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';
import {
  fetchPendingRecords,
  updateWelcomeUrl,
  validateAirtableConfig,
} from '@/lib/airtable/client';
import { AIRTABLE_FIELDS } from '@/constants/airtable';
import { generateWelcomeToken, updateParticipantWelcomeMessage } from '@/lib/firebase/welcome';
import { generateWelcomeMessage } from '@/lib/ai/welcome-message';
import type { ProcessResult, CronJobResult } from '@/lib/airtable/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const CURRENT_COHORT_ID = process.env.CURRENT_COHORT_ID || '6';
const WELCOME_API_SECRET = process.env.WELCOME_API_SECRET;

/**
 * 전화번호로 Firestore에서 참가자 찾기
 */
async function findParticipantByPhone(phoneNumber: string) {
  const db = getAdminDb();
  const snapshot = await db
    .collection('participants')
    .where('phoneNumber', '==', phoneNumber)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    data: snapshot.docs[0].data(),
  };
}

/**
 * Firestore에 새 참가자 등록 (status: applicant)
 */
async function createApplicant(
  name: string,
  phoneNumber: string,
  cohortId: string
): Promise<string> {
  const db = getAdminDb();

  // 참가자 ID 생성: cohort{기수}-{이름}
  const participantId = `cohort${cohortId}-${name}`;

  const now = Timestamp.now();
  const participantData = {
    id: participantId,
    name,
    phoneNumber,
    cohortId,
    status: 'applicant',
    firebaseUid: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('participants').doc(participantId).set(participantData);

  logger.info('Created new applicant in Firestore', {
    participantId,
    name,
    cohortId,
  });

  return participantId;
}

/**
 * 단일 레코드 처리
 */
async function processRecord(
  recordId: string,
  name: string,
  phoneNumber: string,
  callSummary: string | undefined
): Promise<ProcessResult> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://philipandsophy.com';

  try {
    // 1. Firestore에서 기존 참가자 확인
    let existingParticipant = await findParticipantByPhone(phoneNumber);
    let isNewParticipant = false;

    // 2. 없으면 새로 등록
    if (!existingParticipant) {
      const newParticipantId = await createApplicant(name, phoneNumber, CURRENT_COHORT_ID);
      existingParticipant = {
        id: newParticipantId,
        data: { name },
      };
      isNewParticipant = true;
    }

    // 3. 웰컴 토큰 생성
    const tokenResult = await generateWelcomeToken(phoneNumber);

    if (!tokenResult.success || !tokenResult.token) {
      return {
        recordId,
        name,
        phoneNumber,
        success: false,
        error: tokenResult.error || 'Token generation failed',
        isNewParticipant,
      };
    }

    // 4. AI 환영 메시지 생성 (callSummary가 50자 이상인 경우)
    if (callSummary && callSummary.trim().length > 50 && tokenResult.participantId) {
      try {
        const aiResult = await generateWelcomeMessage({
          memberName: name,
          callSummary: callSummary.trim(),
        });

        if (aiResult.success && aiResult.message) {
          await updateParticipantWelcomeMessage(
            tokenResult.participantId,
            aiResult.message,
            callSummary.trim()
          );
          logger.info('AI welcome message generated', {
            participantId: tokenResult.participantId,
          });
        }
      } catch (aiError) {
        // AI 생성 실패해도 계속 진행
        logger.error('AI welcome message generation failed (non-blocking)', aiError);
      }
    }

    // 5. 웰컴 URL 생성
    const welcomePageUrl = `${baseUrl}/welcome?token=${tokenResult.token}`;

    // 6. 에어테이블에 URL 업데이트
    await updateWelcomeUrl(recordId, welcomePageUrl);

    logger.info('Successfully processed record', {
      recordId,
      name,
      phoneNumberLast4: phoneNumber.slice(-4),
      isNewParticipant,
    });

    return {
      recordId,
      name,
      phoneNumber,
      success: true,
      welcomePageUrl,
      isNewParticipant,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to process record', {
      recordId,
      name,
      error: errorMessage,
    });

    return {
      recordId,
      name,
      phoneNumber,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * GET /api/cron/welcome-url
 * Vercel Cron Job에서 매일 밤 12시(KST)에 호출
 * 에어테이블에서 합격자를 찾아 웰컴 URL을 생성하고 업데이트
 */
export async function GET(request: NextRequest): Promise<NextResponse<CronJobResult>> {
  const startTime = Date.now();

  try {
    // 1. Vercel Cron 인증 검증
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      logger.warn('Invalid cron secret attempt');
      return NextResponse.json(
        {
          success: false,
          processed: 0,
          successCount: 0,
          failCount: 0,
          results: [],
          executedAt: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // 2. 에어테이블 설정 확인
    if (!validateAirtableConfig()) {
      logger.error('Airtable configuration is missing');
      return NextResponse.json(
        {
          success: false,
          processed: 0,
          successCount: 0,
          failCount: 0,
          results: [],
          executedAt: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    logger.info('Welcome URL cron job started', {
      cohortId: CURRENT_COHORT_ID,
    });

    // 3. 에어테이블에서 처리 대상 레코드 조회
    const pendingRecords = await fetchPendingRecords();

    if (pendingRecords.length === 0) {
      logger.info('No pending records found');
      return NextResponse.json({
        success: true,
        processed: 0,
        successCount: 0,
        failCount: 0,
        results: [],
        executedAt: new Date().toISOString(),
      });
    }

    logger.info(`Found ${pendingRecords.length} pending records`);

    // 4. 각 레코드 처리
    const results: ProcessResult[] = [];

    for (const record of pendingRecords) {
      const name = record.fields[AIRTABLE_FIELDS.NAME];
      const phoneNumber = record.fields[AIRTABLE_FIELDS.PHONE_NUMBER];
      const callSummary = record.fields[AIRTABLE_FIELDS.INTERVIEW_SUMMARY];

      // 필수 필드 체크
      if (!name || !phoneNumber) {
        results.push({
          recordId: record.id,
          name: name || 'Unknown',
          phoneNumber: phoneNumber || '',
          success: false,
          error: 'Missing required fields (name or phoneNumber)',
        });
        continue;
      }

      // 전화번호 정규화 (하이픈 제거)
      const normalizedPhone = phoneNumber.replace(/-/g, '');

      // 레코드 처리
      const result = await processRecord(record.id, name, normalizedPhone, callSummary);
      results.push(result);

      // Rate limit 방지 (에어테이블 5 req/sec)
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    // 5. 결과 요약
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const duration = Date.now() - startTime;

    logger.info('Welcome URL cron job completed', {
      total: results.length,
      success: successCount,
      failed: failCount,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      processed: results.length,
      successCount,
      failCount,
      results,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Welcome URL cron job failed', error);
    return NextResponse.json(
      {
        success: false,
        processed: 0,
        successCount: 0,
        failCount: 0,
        results: [],
        executedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
