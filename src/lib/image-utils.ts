import { logger } from './logger';

/**
 * 이미지 URL 유틸리티
 * Firebase Storage 리사이즈 이미지 처리
 */

/**
 * 원본 이미지 URL을 리사이즈 버전 URL로 변환
 * Firebase Resize Images Extension이 생성한 _1200x1200 버전 사용
 *
 * @param originalUrl - 원본 이미지 URL
 * @returns 리사이즈 이미지 URL (실패 시 원본 반환)
 *
 * @example
 * // Before: .../image.jpg?alt=media&token=xxx
 * // After:  .../image_1200x1200.jpg?alt=media&token=xxx
 */
export function getRawResizedUrl(originalUrl: string | undefined | null): string | undefined {
  if (!originalUrl) return undefined;

  // Firebase Storage URL 형식이 아니면 원본 반환
  if (!originalUrl.includes('firebasestorage.googleapis.com')) {
    return originalUrl;
  }

  try {
    // URL 파싱
    const url = new URL(originalUrl);

    // /v0/b/{bucket}/o/{encodedPath} 형식에서 버킷명 추출
    const pathMatch = url.pathname.match(/\/v0\/b\/([^/]+)\/o\/(.+)/);
    if (!pathMatch) {
      logger.warn('Invalid Firebase Storage URL format', { url: originalUrl });
      return originalUrl;
    }

    const bucket = pathMatch[1];  // 버킷명 그대로 유지
    const encodedPath = pathMatch[2];
    const decodedPath = decodeURIComponent(encodedPath);

    // 파일 확장자 추출
    const lastDotIndex = decodedPath.lastIndexOf('.');
    if (lastDotIndex === -1) {
      logger.warn('No file extension found', { path: decodedPath });
      return originalUrl;
    }

    const pathWithoutExt = decodedPath.substring(0, lastDotIndex);
    const extension = decodedPath.substring(lastDotIndex);

    // 이미 리사이즈된 이미지인지 확인 (_1200x1200 등의 패턴이 있는지)
    // 만약 이미 리사이즈된 URL이라면 중복 리사이즈 방지 (또는 원본으로 복구 후 리사이즈해야 함)
    if (pathWithoutExt.match(/_\d+x\d+$/)) {
      return originalUrl; // 이미 리사이즈된 것 같으면 그대로 반환 (혹은 원본 복구 로직 필요 시 추가)
    }

    // 리사이즈 파일명 생성
    const resizedPath = `${pathWithoutExt}_1200x1200${extension}`;
    const encodedResizedPath = encodeURIComponent(resizedPath);

    // 새 URL 구성 (기존 쿼리 파라미터 모두 유지 - token 포함)
    const searchParams = url.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';

    return `${url.origin}/v0/b/${bucket}/o/${encodedResizedPath}${queryString}`;
  } catch (error) {
    // 리사이즈 URL 생성 실패 시 원본 반환 (graceful degradation)
    logger.warn('Failed to generate resized image URL', { error, url: originalUrl });
    return originalUrl;
  }
}

/**
 * 원본 이미지 URL을 프록시 서버 URL로 변환
 * 프록시 서버(src/app/api/proxy-image/route.ts)가 스마트 리다이렉트 처리
 */
export function getResizedImageUrl(originalUrl: string | undefined | null): string | undefined {
  if (!originalUrl) return undefined;
  // Firebase 이외의 URL은 건드리지 않음
  if (!originalUrl.includes('firebasestorage.googleapis.com')) return originalUrl;

  return `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
}

/**
 * 리사이즈된 이미지 URL을 원본 이미지 URL로 복원
 * Firebase Storage의 _WxH 접미사를 제거
 *
 * @param resizedUrl - 리사이즈된 이미지 URL
 * @returns 원본 이미지 URL
 */
export function getOriginalImageUrl(resizedUrl: string | undefined | null): string | undefined {
  if (!resizedUrl) return undefined;

  // Firebase Storage URL 형식이 아니면 그대로 반환
  if (!resizedUrl.includes('firebasestorage.googleapis.com')) {
    return resizedUrl;
  }

  try {
    const url = new URL(resizedUrl);
    const pathMatch = url.pathname.match(/\/v0\/b\/([^/]+)\/o\/(.+)/);
    if (!pathMatch) return resizedUrl;

    const bucket = pathMatch[1];
    const encodedPath = pathMatch[2];
    const decodedPath = decodeURIComponent(encodedPath);

    // _WxH 패턴 제거 (예: _1200x1200, _200x200)
    // 파일 확장자 앞의 패턴을 찾음
    const originalPath = decodedPath.replace(/_\d+x\d+(\.[^.]+)$/, '$1');

    // 변경된 것이 없으면 그대로 반환
    if (originalPath === decodedPath) return resizedUrl;

    const encodedOriginalPath = encodeURIComponent(originalPath);
    const searchParams = url.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';

    return `${url.origin}/v0/b/${bucket}/o/${encodedOriginalPath}${queryString}`;
  } catch (error) {
    logger.warn('Failed to restore original image URL', { error, url: resizedUrl });
    return resizedUrl;
  }
}

// ❌ REMOVED: isResizedImage - 미사용 함수 제거
// ❌ REMOVED: firebaseImageLoader - 미사용 함수 제거

/**
 * 이미지를 무손실 WebP로 변환
 * Canvas API를 사용하여 클라이언트에서 변환
 *
 * @param file - 원본 이미지 파일
 * @returns WebP로 변환된 File 객체
 */
export async function convertToLosslessWebP(file: File): Promise<File> {
  // 이미 WebP인 경우 그대로 반환
  if (file.type === 'image/webp') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // 원본 크기 유지
      canvas.width = img.width;
      canvas.height = img.height;

      if (!ctx) {
        reject(new Error('Canvas context를 생성할 수 없습니다.'));
        return;
      }

      // 이미지 그리기
      ctx.drawImage(img, 0, 0);

      // WebP로 변환 (quality 1.0 = 무손실에 가까운 최고 품질)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('WebP 변환에 실패했습니다.'));
            return;
          }

          // 파일명에서 확장자 교체
          const originalName = file.name;
          const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
          const newFileName = `${nameWithoutExt}.webp`;

          const webpFile = new File([blob], newFileName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          resolve(webpFile);
        },
        'image/webp',
        1.0 // 무손실에 가까운 최고 품질
      );
    };

    img.onerror = () => {
      reject(new Error('이미지 로드에 실패했습니다.'));
    };

    // 이미지 로드
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 캐시 버스트 파라미터가 포함된 URL 반환
 *
 * @param url - 원본 URL
 * @returns 캐시 버스트 파라미터가 추가된 URL
 */
export function addCacheBustParam(url: string): string {
  const timestamp = Date.now();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${timestamp}`;
}
