import admin from 'firebase-admin';

type AdminAppConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

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
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', error);
    }
  }

  return null;
}

function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // 1. 환경 변수 방식 시도
  const config = getAdminConfig();
  if (config) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
    });
  }

  // 2. 파일 경로 방식 시도 (로컬 개발)
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
  }

  throw new Error(
    'Missing Firebase Admin credentials. Provide one of:\n' +
    '1. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY\n' +
    '2. FIREBASE_SERVICE_ACCOUNT (JSON string)\n' +
    '3. FIREBASE_SERVICE_ACCOUNT_PATH (file path)'
  );
}

/**
 * Lazy initialization으로 빌드 시 에러 방지
 */
function getAdminApp() {
  return initializeAdminApp();
}

export function getAdminDb() {
  return getAdminApp().firestore();
}

export function getAdminAuth() {
  return getAdminApp().auth();
}

// 하위 호환성을 위한 export (deprecated)
export const adminDb = new Proxy({} as ReturnType<typeof getAdminDb>, {
  get(target, prop) {
    return getAdminDb()[prop as keyof ReturnType<typeof getAdminDb>];
  }
});

export const adminAuth = new Proxy({} as ReturnType<typeof getAdminAuth>, {
  get(target, prop) {
    return getAdminAuth()[prop as keyof ReturnType<typeof getAdminAuth>];
  }
});

export { admin };
