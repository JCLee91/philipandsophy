/**
 * 재원1, 재원2 원형 이미지 교체 스크립트
 */

import * as admin from 'firebase-admin';
import { join } from 'path';
import * as os from 'os';

// Firebase Admin 초기화
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'philipandsophy.firebasestorage.app',
  });
}

const db = admin.firestore().database('seoul');
const bucket = admin.storage().bucket();

async function uploadToStorage(localPath: string, storagePath: string): Promise<string> {
  console.log(`Uploading: ${storagePath}`);

  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000',
    },
  });

  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
  return publicUrl;
}

async function main() {
  console.log('🔄 재원1, 재원2 원형 이미지 교체 중...\n');

  const CIRCLE_DIR = join(os.homedir(), 'Downloads', 'profilecircle_2_webp');

  // 재원1 = 이재원 → 원형_2기_재원-1.webp 사용
  // 재원2 = 차재원 → 원형_2기_재원.webp 사용

  // 재원1 (이재원) 원형 이미지 업로드
  const jaewon1Path = join(CIRCLE_DIR, '원형_2기_재원-1.webp');
  const jaewon1StoragePath = 'profileImagesCircle/cohort2-재원1.webp';
  const jaewon1Url = await uploadToStorage(jaewon1Path, jaewon1StoragePath);

  await db.collection('participants').doc('cohort2-재원1').update({
    profileImageCircle: jaewon1Url,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ 재원1 (이재원) 원형 이미지 업데이트 완료\n`);

  // 재원2 (차재원) 원형 이미지 업로드
  const jaewon2Path = join(CIRCLE_DIR, '원형_2기_재원.webp');
  const jaewon2StoragePath = 'profileImagesCircle/cohort2-재원2.webp';
  const jaewon2Url = await uploadToStorage(jaewon2Path, jaewon2StoragePath);

  await db.collection('participants').doc('cohort2-재원2').update({
    profileImageCircle: jaewon2Url,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ 재원2 (차재원) 원형 이미지 업데이트 완료\n`);

  console.log('🎉 원형 이미지 교체 완료!');
}

main().catch(console.error);
