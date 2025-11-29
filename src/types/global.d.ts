/**
 * 전역 타입 정의
 */

declare global {
  interface Window {
    /**
     * Facebook Pixel 트래킹 함수
     */
    fbq?: (
      action: 'track' | 'trackCustom',
      eventName: string,
      params?: Record<string, string | number>
    ) => void;

    /**
     * Google Analytics 데이터 레이어
     */
    dataLayer?: any[];

    /**
     * Google Analytics gtag 함수
     */
    gtag?: (...args: any[]) => void;
  }
}

export { };
