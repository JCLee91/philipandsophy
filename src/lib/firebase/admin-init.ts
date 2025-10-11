import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;
let cachedBucket: Bucket | null = null;

/**
 * Firebase Admin SDK 초기화 및 인스턴스 반환
 *
 * 모든 스크립트에서 공통으로 사용할 수 있도록 중앙화된 초기화 로직
 * 캐싱을 통해 중복 초기화 방지
 *
 * @returns Firebase Admin SDK 인스턴스 (app, db, bucket)
 */
export function getFirebaseAdmin() {
  // 캐시된 인스턴스가 있으면 반환
  if (cachedApp && cachedDb && cachedBucket) {
    return { app: cachedApp, db: cachedDb, bucket: cachedBucket };
  }

  const serviceAccount = require('../../../firebase-service-account.json');

  // Firebase Admin 앱 초기화 (이미 초기화된 경우 재사용)
  if (!getApps().length) {
    cachedApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    cachedApp = getApps()[0];
  }

  // Firestore 및 Storage 인스턴스 생성
  cachedDb = getFirestore();
  cachedBucket = getStorage().bucket();

  return { app: cachedApp, db: cachedDb, bucket: cachedBucket };
}
