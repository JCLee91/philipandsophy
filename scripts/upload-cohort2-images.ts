/**
 * 2기 멤버 프로필 이미지 업로드 스크립트
 *
 * 1. PNG → WebP 무손실 변환
 * 2. Firebase Storage 업로드
 * 3. Firestore 참가자 문서 업데이트
 */

import * as admin from 'firebase-admin';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
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
const DOWNLOADS_DIR = join(os.homedir(), 'Downloads');
const PROFILE_DIR = join(DOWNLOADS_DIR, 'profile_2');
const CIRCLE_DIR = join(DOWNLOADS_DIR, 'profilecircle_2');
const TEMP_DIR = join(DOWNLOADS_DIR, 'temp_webp_2');

console.log('📂 경로 확인:');
console.log('  DOWNLOADS_DIR:', DOWNLOADS_DIR);
console.log('  PROFILE_DIR:', PROFILE_DIR);
console.log('  CIRCLE_DIR:', CIRCLE_DIR);
console.log('  PROFILE_DIR exists:', existsSync(PROFILE_DIR));
console.log('  CIRCLE_DIR exists:', existsSync(CIRCLE_DIR));
console.log();

// 2기 멤버 이름 매핑 (파일명 → Firestore 이름)
const MEMBER_NAME_MAP: Record<string, string> = {
  '김도환': '김도환',
  '김수진': '김수진',
  '김태형': '김태형',
  '김한솔': '김한솔',
  '김혜진': '김혜진',
  '박진우': '박진우',
  '석윤': '석윤',
  '양재람': '양재람',
  '유승희': '유승희',
  '이원우': '이원우',
  '이재원': '이재원',
  '이호연': '이호연',
  '장상준': '장상준',
  '장성국': '조성국',  // 파일명과 Firestore 이름이 다름
  '정석원': '정석원',
  '정양원': '정양원',
  '조성국': '조성국',
  '차재원': '차재원',
};

// 원형 이미지 파일명 매핑
const CIRCLE_NAME_MAP: Record<string, string> = {
  '다빈': '한다빈',
  '도환': '김도환',
  '상준': '장상준',
  '석원': '정석원',
  '석윤': '석윤',
  '성국': '조성국',
  '성완': '장성완',
  '수진': '김수진',
  '승희': '유승희',
  '양원': '정양원',
  '영빈': '이영빈',
  '영신': '김영신',
  '원우': '이원우',
  '재람': '양재람',
  '재연': '최재연',
  '재원': '이재원',
  '정희': '윤정희',
  '진우': '박진우',
  '태형': '김태형',
  '한솔': '김한솔',
  '현영': '이현영',
  '혜진': '김혜진',
  '호연': '이호연',
};

async function convertToWebP(inputPath: string, outputPath: string): Promise<void> {
  console.log(`Converting: ${inputPath} → ${outputPath}`);

  // cwebp -lossless 옵션으로 무손실 변환
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

  const file = bucket.file(storagePath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: '03-01-2500',
  });

  // Public URL 생성
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

  return publicUrl;
}

async function main() {
  console.log('🚀 2기 멤버 프로필 이미지 업로드 시작...\n');

  // 임시 디렉토리 생성
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }

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

  // 3. 프로필 이미지 처리
  const allProfileFiles = readdirSync(PROFILE_DIR);
  console.log(`전체 파일 수: ${allProfileFiles.length}`);
  console.log(`모든 파일:`, allProfileFiles);

  const profileFiles = allProfileFiles.filter(f => f.startsWith('Profile_2') && f.toLowerCase().endsWith('.png'));
  console.log(`\n📁 프로필 이미지 파일: ${profileFiles.length}개`);
  console.log(`필터링된 파일:`, profileFiles, '\n');

  for (const file of profileFiles) {
    // 파일명에서 이름 추출: "Profile_2기_김도환.png" → "김도환"
    const match = file.match(/Profile_2.*?_(.+)\.png/);
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
      // WebP 변환
      const inputPath = join(PROFILE_DIR, file);
      const webpFileName = `${memberName}.webp`;
      const webpPath = join(TEMP_DIR, webpFileName);

      await convertToWebP(inputPath, webpPath);

      // Storage 업로드
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

  // 4. 원형 이미지 처리
  const allCircleFiles = readdirSync(CIRCLE_DIR);
  console.log(`\n전체 원형 파일 수: ${allCircleFiles.length}`);
  console.log(`첫 5개 원형 파일:`, allCircleFiles.slice(0, 5));

  // 한글 유니코드 문제로 인해 모든 png 파일을 처리 (1기는 이미 처리되어 있으므로 2기만 처리됨)
  const circleFiles = allCircleFiles.filter(f => f.toLowerCase().endsWith('.png'));
  console.log(`📁 원형 이미지 파일: ${circleFiles.length}개`);
  console.log(`필터링된 원형 파일:`, circleFiles.slice(0, 5), '\n');

  for (const file of circleFiles) {
    // 파일명에서 이름 추출: "원형_2기_도환.png" → "도환"
    const match = file.match(/원형_2기_(.+?)(-\d+)?\.png/);
    if (!match) continue;

    const shortName = match[1];
    const memberName = CIRCLE_NAME_MAP[shortName];

    if (!memberName) {
      console.log(`⚠️  원형 매핑 없음: ${shortName}`);
      continue;
    }

    // 2기 멤버만 처리
    if (!Object.values(MEMBER_NAME_MAP).includes(memberName)) {
      console.log(`⏭️  1기 멤버 스킵: ${memberName}`);
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
      // WebP 변환
      const inputPath = join(CIRCLE_DIR, file);
      const webpFileName = `${memberName}_circle.webp`;
      const webpPath = join(TEMP_DIR, webpFileName);

      await convertToWebP(inputPath, webpPath);

      // Storage 업로드
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
