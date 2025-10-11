'use client';

import imageCompression from 'browser-image-compression';
import { logger } from './logger';

/**
 * 이미지 압축 설정
 */
export const IMAGE_COMPRESSION_CONFIG = {
  MAX_SIZE_MB: 5, // 최대 파일 크기 (MB)
  MAX_WIDTH_OR_HEIGHT: 1920, // 최대 가로/세로 크기 (px)
  USE_WEB_WORKER: true, // 웹 워커 사용 (성능 향상)
  FILE_TYPE: 'image/jpeg', // 출력 형식
  INITIAL_QUALITY: 0.8, // 초기 압축 품질
} as const;

/**
 * 이미지 파일을 자동으로 압축
 *
 * @param file - 원본 이미지 파일
 * @param maxSizeMB - 최대 파일 크기 (기본: 5MB)
 * @returns 압축된 이미지 파일
 *
 * 동작:
 * 1. 파일 크기가 maxSizeMB 이하면 원본 반환
 * 2. 초과하면 압축 시작
 * 3. HEIC/HEIF 등 모든 형식 → JPEG로 변환
 * 4. 최대 1920px로 리사이징
 * 5. 압축 실패 시 원본 반환 (fallback)
 */
export async function compressImageIfNeeded(
  file: File,
  maxSizeMB: number = IMAGE_COMPRESSION_CONFIG.MAX_SIZE_MB
): Promise<File> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  try {
    // 1. 파일 크기가 제한 이하면 원본 반환
    if (file.size <= maxSizeBytes) {
      logger.info('이미지 압축 불필요', {
        originalSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        threshold: maxSizeMB + 'MB',
      });
      return file;
    }

    logger.info('이미지 압축 시작', {
      originalSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      originalType: file.type,
      targetSize: maxSizeMB + 'MB',
    });

    // 2. 압축 옵션 설정
    const options = {
      maxSizeMB,
      maxWidthOrHeight: IMAGE_COMPRESSION_CONFIG.MAX_WIDTH_OR_HEIGHT,
      useWebWorker: IMAGE_COMPRESSION_CONFIG.USE_WEB_WORKER,
      fileType: IMAGE_COMPRESSION_CONFIG.FILE_TYPE,
      initialQuality: IMAGE_COMPRESSION_CONFIG.INITIAL_QUALITY,
    };

    // 3. 압축 실행
    const compressedFile = await imageCompression(file, options);

    logger.info('이미지 압축 완료', {
      originalSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      compressedSize: (compressedFile.size / 1024 / 1024).toFixed(2) + 'MB',
      reduction: (((file.size - compressedFile.size) / file.size) * 100).toFixed(1) + '%',
    });

    return compressedFile;
  } catch (error) {
    // 4. 압축 실패 시 원본 반환 (fallback)
    logger.error('이미지 압축 실패, 원본 파일 사용', error);
    return file;
  }
}

/**
 * 이미지 압축 with 진행률 콜백
 *
 * @param file - 원본 이미지 파일
 * @param onProgress - 진행률 콜백 (0-100)
 * @param maxSizeMB - 최대 파일 크기 (기본: 5MB)
 * @returns 압축된 이미지 파일
 */
export async function compressImageWithProgress(
  file: File,
  onProgress: (progress: number) => void,
  maxSizeMB: number = IMAGE_COMPRESSION_CONFIG.MAX_SIZE_MB
): Promise<File> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  try {
    // 압축 불필요한 경우
    if (file.size <= maxSizeBytes) {
      onProgress(100);
      return file;
    }

    const options = {
      maxSizeMB,
      maxWidthOrHeight: IMAGE_COMPRESSION_CONFIG.MAX_WIDTH_OR_HEIGHT,
      useWebWorker: IMAGE_COMPRESSION_CONFIG.USE_WEB_WORKER,
      fileType: IMAGE_COMPRESSION_CONFIG.FILE_TYPE,
      initialQuality: IMAGE_COMPRESSION_CONFIG.INITIAL_QUALITY,
      onProgress, // 진행률 콜백
    };

    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    logger.error('이미지 압축 실패, 원본 파일 사용', error);
    onProgress(100);
    return file;
  }
}

/**
 * 이미지 파일 검증
 *
 * @param file - 검증할 파일
 * @param maxSizeMB - 최대 파일 크기 (기본: 5MB)
 * @returns 검증 결과 { valid: boolean, error?: string }
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = IMAGE_COMPRESSION_CONFIG.MAX_SIZE_MB
): { valid: boolean; error?: string } {
  // 파일 존재 여부
  if (!file) {
    return { valid: false, error: '파일이 선택되지 않았습니다.' };
  }

  // 파일 타입 검증 (이미지만 허용)
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: '이미지 파일만 업로드 가능합니다.' };
  }

  // 파일 크기 검증 (압축 전 원본 기준)
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const MAX_ORIGINAL_SIZE = 50 * 1024 * 1024; // 원본 최대 50MB (압축 후 5MB 이하로 만들 수 있음)

  if (file.size > MAX_ORIGINAL_SIZE) {
    return {
      valid: false,
      error: `파일이 너무 큽니다. 최대 ${MAX_ORIGINAL_SIZE / 1024 / 1024}MB까지 가능합니다.`,
    };
  }

  return { valid: true };
}
