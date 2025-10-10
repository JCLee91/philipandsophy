/**
 * Convert All Profile Images to WebP and Upload to Firebase
 * 모든 참가자 프로필 이미지를 WebP로 변환하고 Firebase Storage에 업로드합니다.
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

// 20명 참가자 이미지 정보
const PARTICIPANTS = [
  { name: '박지영', filename: '1_박지영.png', id: 'park-jiyoung' },
  { name: '최종호', filename: '2_최종호.png', id: 'choi-jongho' },
  { name: '서민석', filename: '3_서민석.png', id: 'seo-minseok' },
  { name: '서현명', filename: '4_서현명.png', id: 'seo-hyunmyeong' },
  { name: '김산하', filename: '5_김산하.png', id: 'kim-sanha' },
  { name: '하진영', filename: '6_하진영.png', id: 'ha-jinyoung' },
  { name: '이인재', filename: '7_이인재.png', id: 'lee-injae' },
  { name: '이예림', filename: '8_이예림.png', id: 'lee-yerim' },
  { name: '유하람', filename: '9_유하람.png', id: 'yoo-haram' },
  { name: '손다진', filename: '10_손다진.png', id: 'son-dajin' },
  { name: '이지현', filename: '11_이지현.png', id: 'lee-jihyun' },
  { name: '김청랑', filename: '12_김청랑.png', id: 'kim-cheongrang' },
  { name: '김정현', filename: '13_김정현.png', id: 'kim-junghyun' },
  { name: '김동현', filename: '14_김동현.png', id: 'kim-donghyun' },
  { name: '방유라', filename: '15_방유라.png', id: 'bang-yura' },
  { name: '유진욱', filename: '16_유진욱.png', id: 'yoo-jinwook' },
  { name: '조현우', filename: '17_조현우.png', id: 'cho-hyunwoo' },
  { name: '전승훈', filename: '18_전승훈.png', id: 'jeon-seunghoon' },
  { name: '김민준', filename: 'Profile_1기_김민준 (2).png', id: 'kim-minjun' },
  { name: '이윤지', filename: 'Profile_1기_이윤지 (1).png', id: 'lee-yoonji' },
];

/**
 * PNG 이미지를 WebP로 변환
 */
async function convertToWebP(inputPath: string, outputPath: string): Promise<void> {
  console.log(`🔄 WebP 변환 중: ${path.basename(inputPath)}`);

  await sharp(inputPath)
    .webp({ quality: 85 }) // 고품질 WebP
    .toFile(outputPath);

  console.log(`✅ WebP 변환 완료: ${path.basename(outputPath)}`);
}

/**
 * 파일을 Firebase Storage에 업로드
 */
async function uploadFile(localPath: string, storagePath: string): Promise<string> {
  console.log(`📤 업로드 중: ${path.basename(localPath)} → ${storagePath}`);

  // Firebase Storage에 업로드
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: 'image/webp',
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
 * 원형 프로필 이미지도 WebP로 변환 및 업로드
 */
async function processCircleImages() {
  console.log('\n🔄 원형 프로필 이미지 WebP 변환 시작');
  console.log('─'.repeat(60));

  for (const participant of PARTICIPANTS) {
    const circlePath = `/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/profil-circle/${participant.name.replace(/[김박최서이유손하전조]/g, (match) => {
      const koreanToCircle: { [key: string]: string } = {
        '김': '김', '박': '박', '최': '최', '서': '서', '이': '이', '유': '유', '손': '손', '하': '하', '전': '전', '조': '조'
      };
      return koreanToCircle[match] || match;
    })}.png`;

    if (fs.existsSync(circlePath)) {
      const webpCirclePath = circlePath.replace('.png', '.webp');
      const circleStoragePath = `profiles/${participant.id}-circle.webp`;

      // WebP 변환
      await convertToWebP(circlePath, webpCirclePath);

      // Firebase 업로드
      await uploadFile(webpCirclePath, circleStoragePath);

      // 임시 WebP 파일 삭제
      fs.unlinkSync(webpCirclePath);
    }
  }
}

/**
 * 큰 프로필 이미지를 WebP로 변환 및 업로드
 */
async function processProfileImages() {
  console.log('\n🔄 큰 프로필 이미지 WebP 변환 시작');
  console.log('─'.repeat(60));

  for (const participant of PARTICIPANTS) {
    const profilePath = `/Users/jclee/Desktop/휠즈랩스/projectpns/public/image/members_10/${participant.filename}`;

    if (fs.existsSync(profilePath)) {
      const webpProfilePath = profilePath.replace('.png', '.webp');
      const profileStoragePath = `profiles/${participant.id}-profile.webp`;

      // WebP 변환
      await convertToWebP(profilePath, webpProfilePath);

      // Firebase 업로드
      await uploadFile(webpProfilePath, profileStoragePath);

      // 임시 WebP 파일 삭제
      fs.unlinkSync(webpProfilePath);
    }
  }
}

/**
 * Firestore 참가자 문서 업데이트 (WebP URL로)
 */
async function updateFirestoreWithWebP() {
  console.log('\n🔄 Firestore WebP URL 업데이트 시작');
  console.log('─'.repeat(60));

  for (const participant of PARTICIPANTS) {
    try {
      // 참가자 찾기
      const participantsRef = db.collection('participants');
      const snapshot = await participantsRef.where('name', '==', participant.name).limit(1).get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const profileUrl = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/profiles/${participant.id}-profile.webp`;
        const circleUrl = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/profiles/${participant.id}-circle.webp`;

        await doc.ref.update({
          profileImage: profileUrl,
          profileImageCircle: circleUrl,
          updatedAt: new Date(),
        });

        console.log(`✅ Firestore 업데이트 완료: ${participant.name}`);
      }
    } catch (error) {
      console.error(`❌ ${participant.name} 업데이트 실패:`, error);
    }
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 20명 참가자 프로필 이미지를 WebP로 변환 및 업로드 시작');
  console.log('='.repeat(70));

  try {
    // 1. 원형 프로필 이미지 처리
    await processCircleImages();

    // 2. 큰 프로필 이미지 처리
    await processProfileImages();

    // 3. Firestore 업데이트
    await updateFirestoreWithWebP();

    console.log('\n' + '='.repeat(70));
    console.log('🎉 모든 프로필 이미지 WebP 변환 및 업로드 완료!');
    console.log('✅ 20명 참가자 모두 처리됨');
    console.log('✅ Firebase Storage에 WebP 파일 업로드 완료');
    console.log('✅ Firestore 문서 업데이트 완료');
    console.log('='.repeat(70));
  } catch (error) {
    console.error('\n❌ 처리 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
