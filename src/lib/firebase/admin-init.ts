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

  // ✅ 환경 변수 필수 (보안 강화)
  if (!process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error(
      'Firebase Admin SDK credentials not found. ' +
      'Required environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  // Firebase Admin 앱 초기화 (이미 초기화된 경우 재사용)
  if (!getApps().length) {
    console.log('[Firebase Admin] Initializing with environment variables');
    cachedApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
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
