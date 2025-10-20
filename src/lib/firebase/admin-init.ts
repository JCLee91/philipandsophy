import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';
import type { ServiceAccount } from 'firebase-admin';

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

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  let credentialSource: string | ServiceAccount | undefined;

  if (projectId && clientEmail && privateKey) {
    credentialSource = {
      projectId,
      clientEmail,
      privateKey,
    };
  } else if (serviceAccountJson) {
    try {
      credentialSource = JSON.parse(serviceAccountJson) as ServiceAccount;
    } catch (error) {
      throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON string');
    }
  } else if (serviceAccountPath) {
    credentialSource = path.resolve(process.cwd(), serviceAccountPath);
  }

  if (!credentialSource) {
    throw new Error(
      'Firebase Admin SDK credentials not found. Provide one of the following:\n' +
      '1. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY\n' +
      '2. FIREBASE_SERVICE_ACCOUNT (JSON string)\n' +
      '3. FIREBASE_SERVICE_ACCOUNT_PATH (relative or absolute path)'
    );
  }

  // Firebase Admin 앱 초기화 (이미 초기화된 경우 재사용)
  if (!getApps().length) {
    console.log('[Firebase Admin] Initializing with provided credentials');
    cachedApp = initializeApp({
      credential: cert(credentialSource),
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
