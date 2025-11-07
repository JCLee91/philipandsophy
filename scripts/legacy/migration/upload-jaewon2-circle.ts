/**
 * 재원2 (차재원) 원형 이미지 업로드 스크립트
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

async function main() {
  console.log('🚀 재원2 원형 이미지 업로드...\n');

  const webpPath = join(os.homedir(), 'Downloads', 'profilecircle_2_webp', '원형_2기_재원-1.webp');
  const storagePath = 'profileImagesCircle/cohort2-재원2.webp';

  // Storage 업로드
  console.log(`Uploading: ${storagePath}`);
  await bucket.upload(webpPath, {
    destination: storagePath,
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000',
    },
  });

  // Public URL 생성
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

  // Firestore 업데이트
  const participantRef = db.collection('participants').doc('cohort2-재원2');
  await participantRef.update({
    profileImageCircle: publicUrl,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ 재원2 원형 이미지 업로드 완료`);
  console.log(`   URL: ${publicUrl}`);
}

main().catch(console.error);
