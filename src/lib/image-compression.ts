'use client';

/**
 * @deprecated 이 파일은 더 이상 사용되지 않습니다 (2025-10-10)
 *
 * 원본 이미지를 직접 업로드하는 방식으로 변경되었습니다.
 * - 압축 로직 제거: compressImageIfNeeded, compressImageWithProgress
 * - 유지되는 함수: validateImageFile (파일 검증용)
 *
 * 압축 기능이 다시 필요할 경우를 대비해 코드는 보존합니다.
 */

import imageCompression from 'browser-image-compression';
import { logger } from './logger';
import { withTimeout } from './utils';

/**
 * 이미지 압축 설정
 * @deprecated 압축 기능은 더 이상 사용되지 않습니다
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
 * @deprecated 더 이상 사용되지 않습니다. 원본 이미지 직접 업로드로 변경되었습니다.
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
  maxSizeMB: number = IMAGE_COMPRESSION_CONFIG.MAX_SIZE_MB,
  onProgress?: (attempt: number, total: number) => void
): Promise<File> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // 1. 제한 이하라면 즉시 반환
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

  // 2단계 압축 전략 (4단계에서 단순화)
  const attempts = [
    {
      maxSizeMB,
      maxWidthOrHeight: IMAGE_COMPRESSION_CONFIG.MAX_WIDTH_OR_HEIGHT,
      useWebWorker: IMAGE_COMPRESSION_CONFIG.USE_WEB_WORKER,
      fileType: IMAGE_COMPRESSION_CONFIG.FILE_TYPE,
      initialQuality: IMAGE_COMPRESSION_CONFIG.INITIAL_QUALITY,
    },
    {
      maxSizeMB: maxSizeMB * 0.9,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: IMAGE_COMPRESSION_CONFIG.FILE_TYPE,
      initialQuality: 0.6,
    },
  ] as const;

  const COMPRESSION_TIMEOUT_PER_ATTEMPT = 15000; // 각 시도당 15초
  let workingFile = file;
  let webWorkerDisabled = false; // Web Worker 타임아웃 발생 시 비활성화

  for (let attempt = 0; attempt < attempts.length; attempt++) {
    const options = {
      ...attempts[attempt],
      useWebWorker: attempts[attempt].useWebWorker && !webWorkerDisabled,
    };

    try {
      onProgress?.(attempt + 1, attempts.length);

      // 각 시도마다 15초 타임아웃 적용
      const compressed = await withTimeout(
        imageCompression(workingFile, options),
        COMPRESSION_TIMEOUT_PER_ATTEMPT,
        `압축 시도 ${attempt + 1} 시간 초과`
      );

      logger.info('이미지 압축 시도 성공', {
        attempt: attempt + 1,
        compressedSize: (compressed.size / 1024 / 1024).toFixed(2) + 'MB',
        reduction: (((workingFile.size - compressed.size) / workingFile.size) * 100).toFixed(1) + '%',
      });

      workingFile = compressed;

      // 목표 크기 달성 시 즉시 반환
      if (workingFile.size <= maxSizeBytes) {
        logger.info('목표 크기 달성', {
          finalSize: (workingFile.size / 1024 / 1024).toFixed(2) + 'MB',
          totalAttempts: attempt + 1,
        });
        return workingFile;
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.message.includes('시간 초과');

      logger.warn('이미지 압축 시도 실패', {
        attempt: attempt + 1,
        isTimeout,
        error: error instanceof Error ? error.message : String(error),
      });

      // 타임아웃 발생 시 Web Worker 비활성화 (다음 시도는 메인 스레드)
      if (isTimeout && options.useWebWorker) {
        webWorkerDisabled = true;
        logger.info('Web Worker 타임아웃 발생, 이후 시도는 메인 스레드 사용');
      }

      // 다음 시도로 계속 진행 (workingFile은 최선의 결과 유지)
    }
  }

  // 모든 시도 후 최종 검증
  const finalFile = workingFile.size < file.size ? workingFile : file;
  const finalSizeMB = (finalFile.size / 1024 / 1024).toFixed(1);

  // 크리티컬 버그 수정: 5MB 초과 시 에러 던지기 (업로드 차단)
  if (finalFile.size > maxSizeBytes) {
    logger.error('압축 실패: 목표 크기 달성 불가', {
      finalSize: finalSizeMB + 'MB',
      targetSize: maxSizeMB + 'MB',
    });

    throw new Error(
      `이미지를 ${maxSizeMB}MB 이하로 압축할 수 없습니다 (현재: ${finalSizeMB}MB).\n\n` +
      `💡 해결 방법:\n` +
      `• 사진 앱에서 이미지를 편집 후 저장하면 크기가 줄어듭니다\n` +
      `• 더 작은 해상도의 이미지를 선택해주세요`
    );
  }

  logger.info('압축 완료', {
    finalSize: finalSizeMB + 'MB',
    originalSize: (file.size / 1024 / 1024).toFixed(1) + 'MB',
    reduction: (((file.size - finalFile.size) / file.size) * 100).toFixed(0) + '%',
  });

  return finalFile;
}

/**
 * 이미지 압축 with 진행률 콜백
 * @deprecated 더 이상 사용되지 않습니다. 원본 이미지 직접 업로드로 변경되었습니다.
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

  // 최소 크기 검증 (100KB)
  const MIN_SIZE_BYTES = 100 * 1024; // 100KB
  if (file.size < MIN_SIZE_BYTES) {
    return {
      valid: false,
      error: '이미지가 너무 작습니다. 최소 100KB 이상이어야 합니다.',
    };
  }

  // 최대 크기 검증 (원본 기준)
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `파일이 너무 큽니다. 최대 ${maxSizeMB}MB까지 가능합니다.`,
    };
  }

  return { valid: true };
}
