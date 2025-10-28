/**
 * 정양원 프로필 이미지 업데이트 스크립트
 *
 * PNG → WebP 변환 후 Firebase Storage 업로드 및 Firestore 업데이트
 */

import * as admin from 'firebase-admin';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import * as os from 'os';

// Firebase Admin 초기화
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'philipandsophy.firebasestorage.app',
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// 경로 설정
const PROJECT_ROOT = join(__dirname, '..');
const SOURCE_IMAGE = join(PROJECT_ROOT, 'public/image/image_update/profileimage/Profile_2기_정양원.png');
const TEMP_DIR = join(os.tmpdir(), 'webp_update');

async function convertToWebP(inputPath: string, outputPath: string): Promise<void> {
  console.log(`Converting: ${inputPath} → ${outputPath}`);
  execSync(`cwebp -lossless "${inputPath}" -o "${outputPath}"`, { stdio: 'inherit' });
}

async function uploadToStorage(localPath: string, storagePath: string): Promise<string> {
  console.log(`Uploading: ${storagePath}`);

  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000',
    },
  });

  // Public URL 생성
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
  return publicUrl;
}

async function main() {
  console.log('🚀 정양원 프로필 이미지 업데이트 시작...\n');

  // 임시 디렉토리 생성
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }

  // 1. 2기 참가자 중 양원(정양원) 찾기
  const participantsSnapshot = await db
    .collection('participants')
    .where('phoneNumber', '==', '01086642851')
    .get();

  if (participantsSnapshot.empty) {
    console.error('❌ 양원 참가자를 찾을 수 없습니다.');
    return;
  }

  const participant = participantsSnapshot.docs[0];
  const participantData = participant.data();
  console.log(`✅ ${participantData.name} 참가자 ID: ${participant.id}\n`);

  try {
    // 2. WebP 변환
    const webpPath = join(TEMP_DIR, '정양원.webp');
    await convertToWebP(SOURCE_IMAGE, webpPath);

    // 3. Storage 업로드
    const storagePath = `profileImages/${participant.id}.webp`;
    const imageUrl = await uploadToStorage(webpPath, storagePath);

    // 4. Firestore 업데이트
    await participant.ref.update({
      profileImage: imageUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ 정양원 프로필 이미지 업로드 완료`);
    console.log(`📷 Image URL: ${imageUrl}\n`);
  } catch (error) {
    console.error(`❌ 프로필 이미지 업로드 실패:`, error);
  }

  console.log('🎉 업데이트 완료!');
}

main().catch(console.error);
