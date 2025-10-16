'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';
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
    } else {
      app = getApps()[0];
    }

    // Initialize Firestore with persistent cache (IndexedDB)
    // This replaces deprecated enableIndexedDbPersistence()
    // Safari Private Mode 대응: persistent cache 실패 시 메모리 캐시로 fallback
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
      logger.info('Firestore initialized with persistent cache and multi-tab sync');
    } catch (cacheError) {
      // Safari Private Mode or IndexedDB disabled
      logger.warn('Persistent cache 실패, 메모리 캐시 사용:', cacheError);
      db = initializeFirestore(app, {});
    }

    storage = getStorage(app);
    auth = getAuth(app);
    initialized = true;

    return { app, db, storage, auth };
  } catch (error: any) {
    logger.error('Firebase 초기화 실패:', error);

    // 초기화 실패 시 최소한의 동작을 위한 fallback
    if (error.code === 'app/duplicate-app') {
      const apps = getApps();
      if (apps.length > 0) {
        app = apps[0];
        db = initializeFirestore(app, {});
        storage = getStorage(app);
        auth = getAuth(app);
        initialized = true;
        logger.info('기존 Firebase 앱 재사용');
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
