import admin from 'firebase-admin';

type AdminAppConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function getAdminConfig(): AdminAppConfig {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
  }

  return { projectId, clientEmail, privateKey };
}

function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const config = getAdminConfig();

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    }),
  });
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
