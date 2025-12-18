import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from './admin';
import {
  WelcomeConfig,
  DEFAULT_WELCOME_CONFIG,
  WelcomeVerifyResponse,
} from '@/types/welcome';
import {
  WELCOME_CONFIG_COLLECTION,
  WELCOME_CONFIG_DOC_ID,
  TOKEN_EXPIRY_DAYS,
} from '@/constants/welcome';
import { logger } from '@/lib/logger';

/**
 * 환영 페이지 설정(계좌 정보)을 가져옵니다.
 */
export async function getWelcomeConfig(): Promise<WelcomeConfig> {
  try {
    const db = getAdminDb();
    const docRef = db.collection(WELCOME_CONFIG_COLLECTION).doc(WELCOME_CONFIG_DOC_ID);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return docSnap.data() as WelcomeConfig;
    } else {
      logger.warn('Welcome config not found, using default.');
      return DEFAULT_WELCOME_CONFIG;
    }
  } catch (error) {
    logger.error('Failed to fetch welcome config', error);
    return DEFAULT_WELCOME_CONFIG;
  }
}

/**
 * 환영 페이지 설정(계좌 정보)을 업데이트합니다.
 */
export async function updateWelcomeConfig(
  config: Partial<WelcomeConfig>,
  userEmail?: string
): Promise<void> {
  try {
    const db = getAdminDb();
    const docRef = db.collection(WELCOME_CONFIG_COLLECTION).doc(WELCOME_CONFIG_DOC_ID);

    const updateData = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail || 'system',
    };

    await docRef.set(updateData, { merge: true });
    logger.info('Welcome config updated successfully');
  } catch (error) {
    logger.error('Failed to update welcome config', error);
    throw error;
  }
}

/**
 * 참가자에게 환영 토큰을 생성합니다.
 * @param phoneNumber 참가자 전화번호
 * @returns 생성된 토큰 정보 또는 에러
 */
export async function generateWelcomeToken(phoneNumber: string): Promise<{
  success: boolean;
  token?: string;
  participantId?: string;
  participantName?: string;
  expiresAt?: Date;
  error?: string;
  code?: string;
}> {
  try {
    const db = getAdminDb();

    // 전화번호로 참가자 찾기
    const participantsRef = db.collection('participants');
    const snapshot = await participantsRef.where('phoneNumber', '==', phoneNumber).get();

    if (snapshot.empty) {
      return {
        success: false,
        error: '해당 전화번호의 참가자를 찾을 수 없습니다.',
        code: 'PARTICIPANT_NOT_FOUND',
      };
    }

    // 첫 번째 매칭 참가자 사용
    const participantDoc = snapshot.docs[0];
    const participantData = participantDoc.data();

    // UUID v4 토큰 생성
    const token = crypto.randomUUID();

    // 만료 시간 계산 (30일 후)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

    // 참가자 문서에 토큰 저장
    await participantDoc.ref.update({
      welcomeToken: token,
      welcomeTokenExpiresAt: Timestamp.fromDate(expiresAt),
      welcomeTokenCreatedAt: Timestamp.now(),
    });

    logger.info(`Welcome token generated for participant: ${participantDoc.id}`);

    return {
      success: true,
      token,
      participantId: participantDoc.id,
      participantName: participantData.name,
      expiresAt,
    };
  } catch (error) {
    logger.error('Failed to generate welcome token', error);
    return {
      success: false,
      error: '토큰 생성 중 오류가 발생했습니다.',
      code: 'SERVER_ERROR',
    };
  }
}

/**
 * 환영 토큰을 검증하고 참가자 정보를 반환합니다.
 * @param token 환영 토큰
 * @returns 검증 결과 및 참가자 정보
 */
export async function verifyWelcomeToken(token: string): Promise<WelcomeVerifyResponse> {
  try {
    const db = getAdminDb();

    // 토큰으로 참가자 찾기
    const participantsRef = db.collection('participants');
    const snapshot = await participantsRef.where('welcomeToken', '==', token).get();

    if (snapshot.empty) {
      return {
        success: false,
        error: '유효하지 않은 토큰입니다.',
        code: 'TOKEN_NOT_FOUND',
      };
    }

    const participantDoc = snapshot.docs[0];
    const participantData = participantDoc.data();

    // 만료 시간 확인
    const expiresAt = participantData.welcomeTokenExpiresAt?.toDate();
    if (expiresAt && expiresAt < new Date()) {
      return {
        success: false,
        error: '토큰이 만료되었습니다.',
        code: 'EXPIRED_TOKEN',
      };
    }

    // 기수 정보 가져오기
    const cohortId = participantData.cohortId;
    let cohortName = '';

    if (cohortId) {
      const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
      if (cohortDoc.exists) {
        cohortName = cohortDoc.data()?.name || '';
      }
    }

    // 계좌 정보 가져오기
    const bankAccount = await getWelcomeConfig();

    return {
      success: true,
      participant: {
        name: participantData.name,
        cohortName,
      },
      bankAccount,
    };
  } catch (error) {
    logger.error('Failed to verify welcome token', error);
    return {
      success: false,
      error: '토큰 검증 중 오류가 발생했습니다.',
      code: 'INVALID_TOKEN',
    };
  }
}
