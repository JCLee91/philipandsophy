/**
 * 이미지 URL 유틸리티
 * Firebase Storage 리사이즈 이미지 처리
 */

/**
 * 원본 이미지 URL을 리사이즈 버전 URL로 변환
 * Firebase Resize Images Extension이 생성한 _1200x1200 버전 사용
 *
 * @param originalUrl - 원본 이미지 URL
 * @returns 리사이즈 이미지 URL
 *
 * @example
 * // Before: .../image.jpg?alt=media
 * // After:  .../image_1200x1200.jpg?alt=media
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
    if (!pathMatch) return originalUrl;

    const bucket = pathMatch[1];  // 버킷명 그대로 유지
    const encodedPath = pathMatch[2];
    const decodedPath = decodeURIComponent(encodedPath);

    // 파일 확장자 추출
    const lastDotIndex = decodedPath.lastIndexOf('.');
    if (lastDotIndex === -1) return originalUrl;

    const pathWithoutExt = decodedPath.substring(0, lastDotIndex);
    const extension = decodedPath.substring(lastDotIndex);

    // 리사이즈 파일명 생성
    const resizedPath = `${pathWithoutExt}_1200x1200${extension}`;
    const encodedResizedPath = encodeURIComponent(resizedPath);

    // 새 URL 구성 (기존 쿼리 파라미터 모두 유지)
    const searchParams = url.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';

    return `${url.origin}/v0/b/${bucket}/o/${encodedResizedPath}${queryString}`;
  } catch (error) {
    console.warn('Failed to generate resized image URL:', error);
    return originalUrl;
  }
}

/**
 * 이미지 URL이 리사이즈 버전인지 확인
 */
export function isResizedImage(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes('_1200x1200.');
}

/**
 * Next.js Image 컴포넌트용 loader
 * Firebase Storage 이미지를 리사이즈 버전으로 로드
 */
export function firebaseImageLoader({ src }: { src: string }): string {
  return getResizedImageUrl(src) || src;
}
