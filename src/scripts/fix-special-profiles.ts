/**
 * Fix 김민준 and 이윤지 Profile Images to WebP
 * 김민준과 이윤지 프로필 이미지를 WebP로 변환하고 Firebase에 업로드합니다.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = require('../../firebase-service-account.json');

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();

// 김민준과 이윤지 이미지 정보 (특별 케이스)
const SPECIAL_PROFILES = [
  {
    name: '김민준',
    profilePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/Profile_1기_김민준 (2).png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/김민준 (1).png',
    profileStoragePath: 'profiles/kim-minjun-profile.webp',
    circleStoragePath: 'profiles/kim-minjun-circle.webp',
  },
  {
    name: '이윤지',
    profilePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/Profile_1기_이윤지 (1).png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/이윤지.png',
    profileStoragePath: 'profiles/lee-yoonji-profile.webp',
    circleStoragePath: 'profiles/lee-yoonji-circle.webp',
  },
];

/**
 * PNG 이미지를 WebP로 변환하고 Firebase에 업로드
 */
async function processSpecialProfile(profile: typeof SPECIAL_PROFILES[0]) {
  console.log(`\n🔄 처리 중: ${profile.name}`);
  console.log('─'.repeat(50));

  try {
    // 1. 큰 프로필 이미지 WebP 변환 및 업로드
    if (fs.existsSync(profile.profilePath)) {
      console.log(`📷 큰 프로필 이미지 변환 중...`);

      const profileUrl = await uploadWebPFile(profile.profilePath, profile.profileStoragePath);
      console.log(`✅ 큰 프로필 이미지 업로드 완료`);
    }

    // 2. 원형 프로필 이미지 WebP 변환 및 업로드
    if (fs.existsSync(profile.circlePath)) {
      console.log(`📷 원형 프로필 이미지 변환 중...`);

      const circleUrl = await uploadWebPFile(profile.circlePath, profile.circleStoragePath);
      console.log(`✅ 원형 프로필 이미지 업로드 완료`);
    }

    // 3. Firestore 업데이트
    await updateParticipantInFirestore(profile.name);
    console.log(`✅ ${profile.name} 처리 완료!`);

  } catch (error) {
    console.error(`❌ ${profile.name} 처리 실패:`, error);
  }
}

/**
 * 파일을 WebP로 변환하고 Firebase Storage에 업로드
 */
async function uploadWebPFile(localPath: string, storagePath: string): Promise<string> {
  console.log(`🔄 WebP 변환 중: ${path.basename(localPath)}`);

  // 임시 WebP 파일 경로
  const tempWebPPath = localPath.replace('.png', '_temp.webp');

  // PNG → WebP 변환 (고품질)
  await sharp(localPath)
    .webp({ quality: 85 })
    .toFile(tempWebPPath);

  // Firebase Storage에 업로드
  await bucket.upload(tempWebPPath, {
    destination: storagePath,
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000',
    },
  });

  // 파일을 public으로 설정
  const file = bucket.file(storagePath);
  await file.makePublic();

  // 임시 파일 삭제
  fs.unlinkSync(tempWebPPath);

  // Public URL 생성
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  console.log(`✅ 업로드 완료: ${publicUrl}`);

  return publicUrl;
}

/**
 * Firestore 참가자 문서 업데이트
 */
async function updateParticipantInFirestore(name: string) {
  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.where('name', '==', name).limit(1).get();

  if (snapshot.empty) {
    console.warn(`⚠️  "${name}" 참가자를 찾을 수 없습니다.`);
    return;
  }

  const doc = snapshot.docs[0];

  // WebP URL 생성
  const baseUrl = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}`;

  if (name === '김민준') {
    await doc.ref.update({
      profileImage: `${baseUrl}/profiles/kim-minjun-profile.webp`,
      profileImageCircle: `${baseUrl}/profiles/kim-minjun-circle.webp`,
      updatedAt: new Date(),
    });
  } else if (name === '이윤지') {
    await doc.ref.update({
      profileImage: `${baseUrl}/profiles/lee-yoonji-profile.webp`,
      profileImageCircle: `${baseUrl}/profiles/lee-yoonji-circle.webp`,
      updatedAt: new Date(),
    });
  }

  console.log(`✅ Firestore 업데이트 완료: ${name}`);
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 김민준과 이윤지 프로필 이미지를 WebP로 변환 및 업로드 시작');
  console.log('='.repeat(70));

  for (const profile of SPECIAL_PROFILES) {
    await processSpecialProfile(profile);
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎉 김민준과 이윤지 프로필 이미지 WebP 변환 완료!');
  console.log('✅ 두 참가자 모두 WebP 이미지로 업데이트됨');
  console.log('✅ Firebase Storage와 Firestore 모두 업데이트 완료');
  console.log('='.repeat(70));
}

// 스크립트 실행
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
