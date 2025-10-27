import admin from 'firebase-admin';
import { logger } from '@/lib/logger';

type AdminAppConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

// Firebase Admin 초기화 상태 추적
let initializationError: Error | null = null;
let isInitialized = false;

function getAdminConfig(): AdminAppConfig | null {
  // 방법 1: 개별 환경 변수 사용 (Vercel 등 클라우드 환경)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  // 방법 2: JSON 문자열 환경 변수 (Vercel Secrets)
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch (error) {
      logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT', error);
    }
  }

  return null;
}

function initializeAdminApp() {
  // 이미 초기화된 경우 (로그 제거 - 너무 자주 호출됨)
  if (admin.apps.length > 0) {
    isInitialized = true;
    return admin.app();
  }

  console.log('🚀 [Firebase Admin] 새로운 앱 초기화 시작...');

  // 이전에 초기화 실패한 경우 에러 재발생
  if (initializationError) {
    console.error('❌ [Firebase Admin] 이전 초기화 실패 에러 재발생');
    throw initializationError;
  }

  try {
    console.log('🔍 [Firebase Admin] 환경 변수 확인 중...');

    // 1. 환경 변수 방식 시도
    const config = getAdminConfig();
    if (config) {
      console.log('✅ [Firebase Admin] 환경 변수 방식 사용:', {
        projectId: config.projectId,
        hasClientEmail: !!config.clientEmail,
        hasPrivateKey: !!config.privateKey,
      });

      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
      });
      isInitialized = true;
      console.log('🎉 [Firebase Admin] 초기화 성공 (환경 변수 방식)');
      return app;
    }

    // 2. 파일 경로 방식 시도 (로컬 개발)
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
      console.log('✅ [Firebase Admin] 파일 경로 방식 사용:', serviceAccountPath);

      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      isInitialized = true;
      console.log('🎉 [Firebase Admin] 초기화 성공 (파일 경로 방식)');
      return app;
    }

    // 3. 모든 방식 실패
    console.error('❌ [Firebase Admin] 사용 가능한 인증 방법 없음');
    const error = new Error(
      'Missing Firebase Admin credentials. Provide one of:\n' +
      '1. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY\n' +
      '2. FIREBASE_SERVICE_ACCOUNT (JSON string)\n' +
      '3. FIREBASE_SERVICE_ACCOUNT_PATH (file path)'
    );
    initializationError = error;
    logger.error('Firebase Admin initialization failed', error);
    throw error;
  } catch (error) {
    // 초기화 에러 저장 (재시도 방지)
    console.error('💥 [Firebase Admin] 초기화 실패:', error);
    initializationError = error as Error;
    logger.error('Firebase Admin initialization error', error);
    throw error;
  }
}

/**
 * Lazy initialization으로 빌드 시 에러 방지
 * 초기화 실패 시 null 반환하여 graceful degradation 지원
 */
function getAdminApp(): admin.app.App | null {
  try {
    return initializeAdminApp();
  } catch (error) {
    logger.error('Failed to get Firebase Admin app', error);
    return null;
  }
}

/**
 * Firestore 인스턴스 가져오기
 * 초기화 실패 시 에러 발생 (API 라우트에서 적절히 처리 필요)
 */
export function getAdminDb() {
  // 로그 제거 (너무 자주 호출되어 로그 폭주)
  const app = getAdminApp();
  if (!app) {
    console.error('❌ [Firebase Admin] app이 null입니다');
    throw new Error('Firebase Admin is not initialized. Check your credentials.');
  }

  return app.firestore();
}

/**
 * Auth 인스턴스 가져오기
 * 초기화 실패 시 에러 발생 (API 라우트에서 적절히 처리 필요)
 */
export function getAdminAuth() {
  const app = getAdminApp();
  if (!app) {
    throw new Error('Firebase Admin is not initialized. Check your credentials.');
  }
  return app.auth();
}

/**
 * 초기화 상태 확인
 */
export function isFirebaseAdminInitialized(): boolean {
  return isInitialized;
}

export { admin };
