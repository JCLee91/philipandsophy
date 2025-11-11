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
export function getResizedImageUrl(originalUrl: string | undefined | null): string | undefined {
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

// ❌ REMOVED: isResizedImage - 미사용 함수 제거
// ❌ REMOVED: firebaseImageLoader - 미사용 함수 제거
