/**
 * 플랫폼 감지 유틸리티
 *
 * iOS 기기 및 PWA Standalone 모드를 감지합니다.
 * 테스트 가능한 순수 함수로 구현되어 있습니다.
 */

const IOS_REGEX = /iPad|iPhone|iPod/;

/**
 * iPadOS 13+ 감지
 *
 * iPadOS 13부터 User Agent가 Mac Safari로 위장됨
 * - navigator.platform: "MacIntel"
 * - navigator.maxTouchPoints > 1: 터치 지원 여부
 * - 'ontouchend' in document: 터치 이벤트 지원 여부
 */
function detectIpadOs(): boolean {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  return (
    navigator.platform === 'MacIntel' &&
    (navigator.maxTouchPoints > 1 || 'ontouchend' in document)
  );
}

/**
 * iOS 기기 감지
 *
 * @returns true if iOS device (iPhone/iPad/iPod)
 */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  return IOS_REGEX.test(userAgent) || detectIpadOs();
}

/**
 * iOS PWA Standalone 모드 감지
 *
 * @returns true if running as iOS PWA (standalone mode)
 *
 * Note:
 * - iOS 13 이하 레거시 API (navigator.standalone) 제거
 * - 시장 점유율 0.1% 미만으로 지원 중단
 * - Modern API만 사용: matchMedia('display-mode: standalone')
 */
export function detectIosStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const isIos = isIosDevice();
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  return isIos && isStandalone;
}
