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
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
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
let initialized = false;

/**
 * Initialize Firebase only if not already initialized
 * Uses modern persistentLocalCache API for offline persistence
 */
export function initializeFirebase() {
  if (initialized) {
    return { app, db, storage, auth };
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
    initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, 'seoul');

    // 2. getFirestore로 인스턴스 획득
    db = getFirestore(app, 'seoul');

    storage = getStorage(app);
    auth = getAuth(app);

    // PWA를 위한 명시적 persistence 설정
    // browserLocalPersistence: localStorage 사용 (기본값)
    // 브라우저를 닫아도 로그인 유지
    setPersistence(auth, browserLocalPersistence)
      .then(() => {

      })
      .catch((error) => {

      });

    initialized = true;

    return { app, db, storage, auth };
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

        // Fallback에서도 persistence 설정
        setPersistence(auth, browserLocalPersistence)
          .catch((error) => {

          });

        initialized = true;

        return { app, db, storage, auth };
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
