/**
 * Update Profile Images for 김민준 and 이윤지
 * 김민준, 이윤지 프로필 이미지를 Firebase Storage에 재업로드합니다.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

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

// 업데이트할 프로필 이미지 정보 (김민준, 이윤지만)
const PROFILE_IMAGES = [
  {
    name: '김민준',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/Profile_1기_김민준 (2).png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/김민준 (1).png',
    storagePath: 'profiles/kim-minjun-profile.png',
    circleStoragePath: 'profiles/kim-minjun-circle.png',
  },
  {
    name: '이윤지',
    localPath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/Profile_1기_이윤지 (1).png',
    circlePath: '/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/이윤지.png',
    storagePath: 'profiles/lee-yoonji-profile.png',
    circleStoragePath: 'profiles/lee-yoonji-circle.png',
  },
];

/**
 * 파일을 Firebase Storage에 업로드
 */
async function uploadFile(localPath: string, storagePath: string): Promise<string> {
  console.log(`📤 업로드 중: ${path.basename(localPath)} → ${storagePath}`);

  // 파일 존재 확인
  if (!fs.existsSync(localPath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${localPath}`);
  }

  // Firebase Storage에 업로드
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000', // 1년 캐시
    },
  });

  // 파일을 public으로 설정
  const file = bucket.file(storagePath);
  await file.makePublic();

  // Public URL 생성
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  console.log(`✅ 업로드 완료: ${publicUrl}`);

  return publicUrl;
}

/**
 * Firestore에서 참가자 찾기 (이름으로)
 */
async function findParticipantByName(name: string) {
  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.where('name', '==', name).limit(1).get();

  if (snapshot.empty) {
    console.warn(`⚠️  "${name}" 참가자를 찾을 수 없습니다.`);
    return null;
  }

  return snapshot.docs[0];
}

/**
 * Firestore 참가자 문서 업데이트
 */
async function updateParticipantImage(
  name: string,
  profileImageUrl: string,
  profileImageCircleUrl: string
) {
  const participantDoc = await findParticipantByName(name);

  if (!participantDoc) {
    return;
  }

  await participantDoc.ref.update({
    profileImage: profileImageUrl,
    profileImageCircle: profileImageCircleUrl,
    updatedAt: new Date(),
  });

  console.log(`✅ Firestore 업데이트 완료: ${name} → ${participantDoc.id}`);
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 김민준, 이윤지 프로필 이미지 재업로드 시작\n');

  for (const profile of PROFILE_IMAGES) {
    console.log(`\n📋 처리 중: ${profile.name}`);
    console.log('─'.repeat(50));

    try {
      // 1. 큰 프로필 이미지 업로드 (members_10)
      const profileUrl = await uploadFile(profile.localPath, profile.storagePath);

      // 2. 원형 프로필 이미지 업로드 (profil-circle)
      console.log(`📤 원형 이미지 업로드 중...`);
      const circleUrl = await uploadFile(profile.circlePath, profile.circleStoragePath);

      // 3. Firestore 업데이트 (큰 이미지 + 원형 이미지 모두 저장)
      await updateParticipantImage(profile.name, profileUrl, circleUrl);

      console.log(`\n✅ ${profile.name} 처리 완료!`);
    } catch (error) {
      console.error(`\n❌ ${profile.name} 처리 실패:`, error);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 프로필 이미지 재업로드 완료!');
  console.log('='.repeat(50));
}

// 스크립트 실행
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
