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

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize Firestore with persistent cache (IndexedDB)
  // This replaces deprecated enableIndexedDbPersistence()
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  logger.info('Firestore initialized with persistent cache and multi-tab sync');

  storage = getStorage(app);
  auth = getAuth(app);
  initialized = true;

  return { app, db, storage, auth };
}

/**
 * @deprecated No longer needed with persistentLocalCache API
 * Kept for backward compatibility
 */
export async function waitForPersistence(): Promise<boolean> {
  return true;
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
