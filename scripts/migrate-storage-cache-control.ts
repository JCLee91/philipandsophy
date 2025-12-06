#!/usr/bin/env tsx

/**
 * Firebase Storage 메타데이터 마이그레이션
 *
 * 목적:
 * - 기존 업로드된 파일들에 cacheControl 메타데이터 추가
 * - Cache-Control: public, max-age=31536000 (1년)
 *
 * 사용법:
 *   npx tsx scripts/migrate-storage-cache-control.ts [--dry-run] [--prefix=path]
 *
 * 옵션:
 *   --dry-run    실제 업데이트 없이 대상 파일만 출력
 *   --prefix     특정 경로만 처리 (예: --prefix=reading_submissions)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Firebase Admin 초기화
function initFirebase() {
  if (getApps().length > 0) {
    return;
  }

  const serviceAccountPath = path.resolve(
    process.cwd(),
    'firebase-service-account.json'
  );

  initializeApp({
    credential: cert(serviceAccountPath),
    storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  });
}

// CLI 인자 파싱
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    prefix: args.find((a) => a.startsWith('--prefix='))?.split('=')[1] || '',
  };
}

// 메인 마이그레이션 함수
async function migrateStorageCacheControl() {
  const { dryRun, prefix } = parseArgs();

  console.log('🚀 Storage Cache-Control 마이그레이션 시작');
  console.log(`   모드: ${dryRun ? '🔍 DRY RUN (미리보기)' : '⚡ 실제 실행'}`);
  if (prefix) {
    console.log(`   경로 필터: ${prefix}`);
  }
  console.log('');

  initFirebase();
  const bucket = getStorage().bucket();

  // 파일 목록 가져오기
  console.log('📂 파일 목록 조회 중...');
  const [files] = await bucket.getFiles({ prefix });

  console.log(`   총 ${files.length}개 파일 발견\n`);

  const TARGET_CACHE_CONTROL = 'public, max-age=31536000';

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // 이미지 확장자만 처리
  const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];

  // 백업 폴더 제외
  const BACKUP_PREFIXES = ['firestore-backup', 'firestore-backups', '2025-10-15T'];

  for (const file of files) {
    // 폴더(디렉토리)는 스킵
    if (file.name.endsWith('/')) {
      continue;
    }

    // 백업 폴더 스킵
    if (BACKUP_PREFIXES.some((prefix) => file.name.startsWith(prefix))) {
      continue;
    }

    // 이미지 파일만 처리
    const ext = path.extname(file.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) {
      continue;
    }

    try {
      // 현재 메타데이터 확인
      const [metadata] = await file.getMetadata();
      const currentCacheControl = metadata.cacheControl;

      // 이미 설정되어 있으면 스킵
      if (currentCacheControl === TARGET_CACHE_CONTROL) {
        skippedCount++;
        continue;
      }

      if (dryRun) {
        console.log(`📝 [DRY RUN] ${file.name}`);
        console.log(`   현재: ${currentCacheControl || '(없음)'}`);
        console.log(`   변경: ${TARGET_CACHE_CONTROL}\n`);
        updatedCount++;
      } else {
        // 메타데이터 업데이트
        await file.setMetadata({
          cacheControl: TARGET_CACHE_CONTROL,
        });
        updatedCount++;

        // 진행 상황 표시 (100개마다)
        if (updatedCount % 100 === 0) {
          console.log(`   ✅ ${updatedCount}개 업데이트 완료...`);
        }
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ 오류: ${file.name}`, error);
    }
  }

  // 결과 출력
  console.log('\n' + '='.repeat(50));
  console.log('📊 마이그레이션 결과');
  console.log('='.repeat(50));
  console.log(`   ${dryRun ? '업데이트 예정' : '업데이트 완료'}: ${updatedCount}개`);
  console.log(`   이미 설정됨 (스킵): ${skippedCount}개`);
  console.log(`   오류: ${errorCount}개`);
  console.log('='.repeat(50));

  if (dryRun && updatedCount > 0) {
    console.log('\n💡 실제 실행하려면: npx tsx scripts/migrate-storage-cache-control.ts');
  }
}

// 실행
migrateStorageCacheControl().catch(console.error);
