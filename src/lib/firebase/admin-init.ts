import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';
import type { Bucket } from '@google-cloud/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';
import type { ServiceAccount } from 'firebase-admin';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;
let cachedBucket: Bucket | null = null;
let cachedAuth: Auth | null = null;

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

  // Storage Bucket 이름 확인
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!storageBucket) {
    throw new Error(
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다.\n' +
      '.env.local 파일에 NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com 추가하세요.'
    );
  }

  // Firebase Admin 앱 초기화 (이미 초기화된 경우 재사용)
  if (!getApps().length) {
    cachedApp = initializeApp({
      credential: cert(credentialSource),
      storageBucket,
    });
  } else {
    cachedApp = getApps()[0];
  }

  // Firestore 및 Storage 인스턴스 생성
  const { getFirestore } = require('firebase-admin/firestore');
  cachedDb = getFirestore(cachedApp);
  cachedBucket = getStorage(cachedApp).bucket(storageBucket);
  cachedAuth = getAuth(cachedApp);

  return { app: cachedApp, db: cachedDb, bucket: cachedBucket, auth: cachedAuth };
}

/**
 * Firebase Admin Auth 인스턴스 반환
 *
 * API 라우트에서 토큰 검증 시 사용
 * 자동으로 Admin 앱을 초기화하므로 auth() 직접 호출 방지
 *
 * @returns Firebase Admin Auth 인스턴스
 */
export function getAdminAuth(): Auth {
  // Admin이 초기화되지 않았으면 초기화
  if (!cachedAuth) {
    getFirebaseAdmin();
  }

  if (!cachedAuth) {
    throw new Error('Firebase Admin Auth initialization failed');
  }

  return cachedAuth;
}
