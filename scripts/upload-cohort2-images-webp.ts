/**
 * 2기 멤버 프로필 이미지 업로드 스크립트 (WebP 직접 업로드 버전)
 *
 * 이미 변환된 WebP 파일들을 Firebase Storage에 업로드하고 Firestore 업데이트
 */

import * as admin from 'firebase-admin';
import { readFileSync, readdirSync } from 'fs';
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

const db = admin.firestore();
const bucket = admin.storage().bucket();

// 경로 설정
const DOWNLOADS_DIR = join(os.homedir(), 'Downloads');
const PROFILE_WEBP_DIR = join(DOWNLOADS_DIR, 'profile_2_webp');
const CIRCLE_WEBP_DIR = join(DOWNLOADS_DIR, 'profilecircle_2_webp');

console.log('📂 경로 확인:');
console.log('  PROFILE_WEBP_DIR:', PROFILE_WEBP_DIR);
console.log('  CIRCLE_WEBP_DIR:', CIRCLE_WEBP_DIR);
console.log();

// 2기 멤버 이름 매핑 (파일명 → Firestore 이름)
// Firestore에는 짧은 이름으로 저장되어 있음 (예: "도환", "수진")
const MEMBER_NAME_MAP: Record<string, string> = {
  // Profile_2기_ 파일들
  '김도환': '도환',
  '김수진': '수진',
  '김태형': '태형',
  '김한솔': '한솔',
  '김혜진': '혜진',
  '박진우': '진우',
  '석윤': '석윤',
  '양재람': '재람',
  '유승희': '승희',
  '이원우': '원우',
  '이재원': '재원1',
  '이호연': '호연',
  '장상준': '상준',
  '장성국': '성국',
  '정석원': '석원',
  '정양원': '양원',
  '차재원': '재원2',

  // Profile_1기_ 파일들 (실제로는 2기 멤버)
  '김영신': '영신',
  '윤정희': '정희',
  '이영빈': '영빈',
  '이현영': '현영',
  '장성완': '성완',
  '최재연': '재연',
  '한다빈': '다빈',
};

// 원형 이미지 파일명 매핑 (파일명 짧은 이름 → Firestore 짧은 이름)
const CIRCLE_NAME_MAP: Record<string, string> = {
  '다빈': '다빈',
  '도환': '도환',
  '상준': '상준',
  '석원': '석원',
  '석윤': '석윤',
  '성국': '성국',
  '성완': '성완',
  '수진': '수진',
  '승희': '승희',
  '양원': '양원',
  '영빈': '영빈',
  '영신': '영신',
  '원우': '원우',
  '재람': '재람',
  '재연': '재연',
  '재원': '재원1',     // 이재원
  '재원-1': '재원2',   // 차재원
  '정희': '정희',
  '진우': '진우',
  '태형': '태형',
  '한솔': '한솔',
  '현영': '현영',
  '혜진': '혜진',
  '호연': '호연',
};

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
  console.log('🚀 2기 멤버 프로필 이미지 업로드 시작...\n');

  // 1. 2기 코호트 ID 조회
  const cohortsSnapshot = await db.collection('cohorts').where('name', '==', '2기').get();

  if (cohortsSnapshot.empty) {
    console.error('❌ 2기 코호트를 찾을 수 없습니다.');
    return;
  }

  const cohort2Id = cohortsSnapshot.docs[0].id;
  console.log(`✅ 2기 코호트 ID: ${cohort2Id}\n`);

  // 2. 2기 참가자 조회
  const participantsSnapshot = await db
    .collection('participants')
    .where('cohortId', '==', cohort2Id)
    .get();

  console.log(`✅ 2기 참가자 수: ${participantsSnapshot.size}\n`);

  // 3. 프로필 이미지 처리 (WebP 파일 직접 업로드)
  const profileFiles = readdirSync(PROFILE_WEBP_DIR).filter(f => f.endsWith('.webp'));
  console.log(`📁 프로필 WebP 이미지 파일: ${profileFiles.length}개\n`);

  for (const file of profileFiles) {
    // 파일명에서 이름 추출: "Profile_1기_김영신.webp" 또는 "Profile_2기_김도환.webp" → "김영신", "김도환"
    const match = file.match(/Profile_[12]기_(.+)\.webp/);
    if (!match) {
      console.log(`⚠️  파일명 형식 오류: ${file}`);
      continue;
    }

    const fileName = match[1];
    const memberName = MEMBER_NAME_MAP[fileName];

    if (!memberName) {
      console.log(`⚠️  매핑 없음: ${fileName}`);
      continue;
    }

    // 참가자 문서 찾기
    const participant = participantsSnapshot.docs.find(
      doc => doc.data().name === memberName
    );

    if (!participant) {
      console.log(`⚠️  참가자 없음: ${memberName}`);
      continue;
    }

    try {
      // WebP 파일 직접 업로드
      const webpPath = join(PROFILE_WEBP_DIR, file);
      const storagePath = `profileImages/${participant.id}.webp`;
      const imageUrl = await uploadToStorage(webpPath, storagePath);

      // Firestore 업데이트
      await participant.ref.update({
        profileImage: imageUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ ${memberName} 프로필 이미지 업로드 완료\n`);
    } catch (error) {
      console.error(`❌ ${memberName} 프로필 이미지 업로드 실패:`, error);
    }
  }

  // 4. 원형 이미지 처리 (WebP 파일 직접 업로드)
  const circleFiles = readdirSync(CIRCLE_WEBP_DIR).filter(f => f.endsWith('.webp'));
  console.log(`\n📁 원형 WebP 이미지 파일: ${circleFiles.length}개\n`);

  for (const file of circleFiles) {
    // 파일명에서 이름 추출: "원형_2기_도환.webp" → "도환"
    const match = file.match(/원형_2기_(.+?)(-\d+)?\.webp/);
    if (!match) continue;

    const shortName = match[1];
    const memberName = CIRCLE_NAME_MAP[shortName];

    if (!memberName) {
      console.log(`⚠️  원형 매핑 없음: ${shortName}`);
      continue;
    }

    // 모든 참가자 처리 (24명 모두 2기)

    // 참가자 문서 찾기
    const participant = participantsSnapshot.docs.find(
      doc => doc.data().name === memberName
    );

    if (!participant) {
      console.log(`⚠️  참가자 없음: ${memberName}`);
      continue;
    }

    try {
      // WebP 파일 직접 업로드
      const webpPath = join(CIRCLE_WEBP_DIR, file);
      const storagePath = `profileImagesCircle/${participant.id}.webp`;
      const imageUrl = await uploadToStorage(webpPath, storagePath);

      // Firestore 업데이트
      await participant.ref.update({
        profileImageCircle: imageUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ ${memberName} 원형 이미지 업로드 완료\n`);
    } catch (error) {
      console.error(`❌ ${memberName} 원형 이미지 업로드 실패:`, error);
    }
  }

  console.log('\n🎉 모든 이미지 업로드 완료!');
}

main().catch(console.error);
