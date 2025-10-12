'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { logger } from '@/lib/logger';

/**
 * Firebase Client Setup
 * Initializes Firebase app and provides Firestore and Storage instances
 * Uses Firebase v12+ persistent cache API (not deprecated enableIndexedDbPersistence)
 */

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let initialized = false;

/**
 * Initialize Firebase only if not already initialized
 * Uses modern persistentLocalCache API for offline persistence
 */
export function initializeFirebase() {
  if (initialized) {
    return { app, db, storage };
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
  initialized = true;

  return { app, db, storage };
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
