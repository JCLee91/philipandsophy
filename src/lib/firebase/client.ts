'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import {
  getAuth,
  Auth,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import { getFunctions, Functions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { firebaseConfig } from './config';
import { logger } from '@/lib/logger';

/**
 * Firebase Client Setup
 * Initializes Firebase app and provides Firestore, Storage, and Auth instances
 * Uses Firebase v12+ persistent cache API (not deprecated enableIndexedDbPersistence)
 */

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let auth: Auth;
let functions: Functions;
let initialized = false;
let authPersistencePromise: Promise<void> | null = null;

async function setBestAuthPersistence(targetAuth: Auth): Promise<void> {
  const candidates = [
    { name: 'INDEXED_DB', persistence: indexedDBLocalPersistence },
    { name: 'LOCAL_STORAGE', persistence: browserLocalPersistence },
    { name: 'IN_MEMORY', persistence: inMemoryPersistence },
  ] as const;

  for (const candidate of candidates) {
    try {
      await setPersistence(targetAuth, candidate.persistence);
      logger.info(`Firebase Auth Persistence set to ${candidate.name}`);
      return;
    } catch (error) {
      logger.warn(`Failed to set Firebase Auth Persistence to ${candidate.name}`, error);
    }
  }
}

/**
 * Initialize Firebase only if not already initialized
 * Uses modern persistentLocalCache API for offline persistence
 */
export function initializeFirebase() {
  if (initialized) {
    return { app, db, storage, auth, functions };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);

      // Initialize App Check with reCAPTCHA Enterprise (optional)
      // Only enable if RECAPTCHA_SITE_KEY is provided
      // TEMPORARILY DISABLED FOR DEBUGGING
      /*
      if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
        try {
          initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
            isTokenAutoRefreshEnabled: true
          });
          logger.info('App Check initialized successfully');
        } catch (error: any) {
          // App Check is optional - don't block app initialization if it fails
          logger.warn('App Check initialization failed (non-critical):', error?.message);
        }
      } else {
        logger.info('App Check disabled - NEXT_PUBLIC_RECAPTCHA_SITE_KEY not configured');
      }
      */
      logger.info('App Check temporarily disabled for debugging');
    } else {
      app = getApps()[0];
    }

    // Initialize Firestore with Seoul DB and persistent cache
    // 1. initializeFirestore로 캐시 설정 + databaseId 지정 (한 번만 호출)
    try {
      initializeFirestore(
        app,
        {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        },
        'seoul'
      );
    } catch (error) {
      // iOS Safari/프라이빗 모드 등에서 IndexedDB 기반 캐시가 실패할 수 있음
      // 이 경우 캐시 없이도 앱이 동작하도록 메모리 캐시로 폴백
      logger.warn('Firestore persistent cache init failed; falling back to memory cache', error);
    }

    // 2. getFirestore로 인스턴스 획득 (캐시 성공/실패와 무관하게 동작)
    db = getFirestore(app, 'seoul');

    storage = getStorage(app);
    auth = getAuth(app);
    functions = getFunctions(app, 'asia-northeast3');

    // PWA 환경(iOS/Android)에서 가장 안정적인 persistence를 선택 (IDB → localStorage → memory)
    authPersistencePromise = setBestAuthPersistence(auth);

    initialized = true;

    return { app, db, storage, auth, functions };
  } catch (error: any) {

    // 초기화 실패 시 최소한의 동작을 위한 fallback
    if (error.code === 'app/duplicate-app') {
      const apps = getApps();
      if (apps.length > 0) {
        app = apps[0];
        // Fallback에서도 getFirestore 사용 (이미 초기화된 경우)
        db = getFirestore(app, 'seoul');
        storage = getStorage(app);
        auth = getAuth(app);
        functions = getFunctions(app, 'asia-northeast3');

        // Fallback에서도 persistence 설정
        authPersistencePromise = setBestAuthPersistence(auth);

        initialized = true;

        return { app, db, storage, auth, functions };
      }
    }

    // Critical error - 앱이 작동하지 않을 것임
    throw new Error(`Firebase 초기화 실패: ${error.message || '알 수 없는 오류'}`);
  }
}

/**
 * Get Firestore database instance
 */
export function getDb(): Firestore {
  if (!db) {
    initializeFirebase();
  }
  return db;
}

/**
 * Get Firebase Storage instance
 */
export function getStorageInstance(): FirebaseStorage {
  if (!storage) {
    initializeFirebase();
  }
  return storage;
}

/**
 * Get Firebase app instance
 */
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    initializeFirebase();
  }
  return app;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

/**
 * Ensure Auth persistence selection has finished.
 * Useful before subscribing to auth state in flaky mobile environments.
 */
export async function ensureAuthPersistenceReady(): Promise<void> {
  if (!auth) {
    initializeFirebase();
  }
  await authPersistencePromise;
}

/**
 * Get Firebase Functions instance
 */
export function getFirebaseFunctions(): Functions {
  if (!functions) {
    initializeFirebase();
  }
  return functions;
}
