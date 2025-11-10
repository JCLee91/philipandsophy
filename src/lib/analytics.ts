/**
 * Analytics 트래킹 유틸리티
 * Facebook Pixel 이벤트 트래킹을 위한 헬퍼 함수
 */

/**
 * Facebook Pixel 이벤트 트래킹
 * @param eventName - 이벤트 이름 (예: 'CompleteRegistration')
 * @param contentName - 콘텐츠 이름 (예: '사전신청폼', '멤버십_신청')
 */
export const trackEvent = (eventName: string, contentName: string): void => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, { content_name: contentName });
  }
};

/**
 * Facebook Pixel CompleteRegistration 이벤트 트래킹 (자주 사용되는 이벤트)
 * @param contentName - 콘텐츠 이름
 */
export const trackRegistration = (contentName: string): void => {
  trackEvent('CompleteRegistration', contentName);
};
