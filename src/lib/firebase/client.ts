'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { logger } from '@/lib/logger';

/**
 * Firebase Client Setup
 * Initializes Firebase app and provides Firestore and Storage instances
 */

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;

/**
 * Initialize Firebase only if not already initialized
 */
export function initializeFirebase() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
  storage = getStorage(app);

  // Enable offline persistence (IndexedDB cache)
  // This dramatically improves load times for repeat visits
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        logger.warn('Persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        logger.warn('Persistence not supported by browser');
      } else {
        logger.error('Persistence error', err);
      }
    });
  }

  return { app, db, storage };
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
