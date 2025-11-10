#!/usr/bin/env node

/**
 * 랜딩페이지 이미지 PNG → 무손실 WebP 변환 스크립트
 *
 * 기능:
 * 1. "업데이트용 이미지(복사해서 활용)" 폴더의 PNG 이미지를 무손실 WebP로 변환
 * 2. 변환된 이미지를 public/image/landing/ 폴더에 저장
 * 3. 캐시버스트를 위한 버전 정보 출력
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const SOURCE_DIR = '업데이트용 이미지(복사해서 활용)';
const TARGET_DIR = 'public/image/landing';

interface ImageFile {
  sourcePath: string;
  targetPath: string;
  fileName: string;
}

async function getImageFiles(): Promise<ImageFile[]> {
  const files: ImageFile[] = [];

  const categories = [
    { folder: '랜딩페이지 - 홈', prefix: 'PnS' },
    { folder: '랜딩페이지 - 멤버십', prefix: 'PnS_Membership' },
    { folder: '랜딩페이지 - 프로그램', prefix: 'PnS_Service' },
  ];

  for (const category of categories) {
    const categoryPath = path.join(SOURCE_DIR, category.folder);

    try {
      const items = await fs.readdir(categoryPath);

      for (const item of items) {
        if (item.endsWith('.png')) {
          const sourcePath = path.join(categoryPath, item);
          const webpFileName = item.replace('.png', '.webp');
          const targetPath = path.join(TARGET_DIR, webpFileName);

          files.push({
            sourcePath,
            targetPath,
            fileName: webpFileName,
          });
        }
      }
    } catch (error) {
      console.error(`⚠️  폴더를 찾을 수 없습니다: ${categoryPath}`);
    }
  }

  return files;
}

async function convertToLosslessWebP(file: ImageFile): Promise<void> {
  try {
    const startTime = Date.now();

    // PNG 파일 읽기
    const sourceBuffer = await fs.readFile(file.sourcePath);
    const sourceSize = sourceBuffer.length;

    // 무손실 WebP로 변환
    const outputBuffer = await sharp(sourceBuffer)
      .webp({
        lossless: true,  // 무손실 압축
        quality: 100,    // 최고 품질
        effort: 6        // 압축 노력도 (0-6, 높을수록 압축률 좋지만 느림)
      })
      .toBuffer();

    // 타겟 디렉토리 확인 및 생성
    const targetDir = path.dirname(file.targetPath);
    await fs.mkdir(targetDir, { recursive: true });

    // WebP 파일 저장
    await fs.writeFile(file.targetPath, outputBuffer);

    const endTime = Date.now();
    const targetSize = outputBuffer.length;
    const compressionRatio = ((1 - targetSize / sourceSize) * 100).toFixed(2);
    const duration = endTime - startTime;

    console.log(`✅ ${file.fileName}`);
    console.log(`   원본: ${(sourceSize / 1024).toFixed(2)}KB`);
    console.log(`   변환: ${(targetSize / 1024).toFixed(2)}KB`);
    console.log(`   압축률: ${compressionRatio}%`);
    console.log(`   소요시간: ${duration}ms\n`);
  } catch (error) {
    console.error(`❌ 변환 실패: ${file.fileName}`);
    console.error(`   ${error}\n`);
    throw error;
  }
}

async function main() {
  console.log('🚀 랜딩페이지 이미지 무손실 WebP 변환 시작\n');
  console.log(`📁 소스: ${SOURCE_DIR}`);
  console.log(`📁 타겟: ${TARGET_DIR}\n`);

  // 이미지 파일 목록 가져오기
  const imageFiles = await getImageFiles();

  if (imageFiles.length === 0) {
    console.log('⚠️  변환할 이미지가 없습니다.');
    return;
  }

  console.log(`📋 총 ${imageFiles.length}개 이미지 발견\n`);

  // 모든 이미지 변환
  let successCount = 0;
  let failCount = 0;

  for (const file of imageFiles) {
    try {
      await convertToLosslessWebP(file);
      successCount++;
    } catch {
      failCount++;
    }
  }

  // 결과 요약
  console.log('=' .repeat(50));
  console.log('📊 변환 결과 요약');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`📁 저장 위치: ${TARGET_DIR}`);
  console.log('=' .repeat(50));

  // 캐시버스트 정보
  const timestamp = Date.now();
  console.log('\n🔄 캐시버스트 정보:');
  console.log(`버전 타임스탬프: ${timestamp}`);
  console.log(`사용 예시: /image/landing/PnS_1.webp?v=${timestamp}`);
}

main().catch((error) => {
  console.error('💥 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});
