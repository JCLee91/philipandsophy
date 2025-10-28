'use client';

/**
 * 이미지 파일 검증 유틸리티
 *
 * 이전: src/lib/image-compression.ts에서 분리
 * 압축 기능은 제거하고 검증 기능만 유지
 */

/**
 * 이미지 파일 검증
 *
 * @param file - 검증할 파일
 * @param maxSizeMB - 최대 파일 크기 (기본: 10MB - 현실적 제한)
 * @returns 검증 결과 { valid: boolean, error?: string }
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  // 파일 존재 여부
  if (!file) {
    return { valid: false, error: '파일이 선택되지 않았습니다.' };
  }

  // 파일 타입 검증 (이미지만 허용)
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: '이미지 파일만 업로드 가능합니다.' };
  }

  // 최대 크기 검증
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `파일이 너무 큽니다. 최대 ${maxSizeMB}MB까지 가능합니다.`,
    };
  }

  return { valid: true };
}

/**
 * URL에서 File 객체 생성 (임시저장 복원용)
 *
 * @param url - 이미지 URL (Firebase Storage URL)
 * @param filename - 파일명 (기본: 'restored-image.jpg')
 * @returns File 객체
 */
export async function createFileFromUrl(
  url: string,
  filename: string = 'restored-image.jpg'
): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('이미지를 불러오지 못했습니다.');
  }
  const blob = await response.blob();
  const headerType = response.headers.get('content-type') ?? '';
  const normalizedType =
    headerType.startsWith('image/')
      ? headerType
      : blob.type && blob.type.startsWith('image/')
      ? blob.type
      : guessMimeTypeFromFilename(filename) ?? 'image/jpeg';

  return new File([blob], filename, {
    type: normalizedType,
    lastModified: Date.now(),
  });
}

function guessMimeTypeFromFilename(name: string): string | null {
  const extension = name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return null;
  }
}

/**
 * 간단한 이미지 압축 (10MB 이상만 압축)
 *
 * @param file - 압축할 이미지 파일
 * @param targetSizeMB - 목표 크기 (기본: 5MB)
 * @returns 압축된 파일 또는 원본
 */
export async function compressImageIfNeeded(
  file: File,
  targetSizeMB: number = 5
): Promise<File> {
  const COMPRESSION_THRESHOLD = 10 * 1024 * 1024; // 10MB

  // 10MB 미만이면 원본 반환
  if (file.size < COMPRESSION_THRESHOLD) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file); // Canvas 실패 시 원본 반환
        return;
      }

      // 최대 해상도 제한 (긴 쪽 기준 2048px)
      const MAX_DIMENSION = 2048;
      let width = img.width;
      let height = img.height;

      if (width > height && width > MAX_DIMENSION) {
        height = (height * MAX_DIMENSION) / width;
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width = (width * MAX_DIMENSION) / height;
        height = MAX_DIMENSION;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // JPEG로 압축 (품질 0.8)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // 압축 실패 시 원본 반환
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      resolve(file); // 이미지 로드 실패 시 원본 반환
    };

    reader.onerror = () => {
      reject(new Error('이미지를 읽을 수 없습니다.'));
    };

    reader.readAsDataURL(file);
  });
}
