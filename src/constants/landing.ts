/**
 * 랜딩페이지 관련 상수
 */

/**
 * 랜딩페이지 공통 상수
 */
export const LANDING_CONSTANTS = {
  /** 사전 신청 폼 URL */
  FORM_URL: '/application',

  /** 이미지 캐시 버스팅 버전 */
  IMAGE_VERSION: '1766000000000',
} as const;

/**
 * 이미지 URL 생성 헬퍼
 * @param imagePath - 이미지 경로
 * @returns 캐시 버스팅 쿼리가 포함된 이미지 URL
 */
export const getImageUrl = (imagePath: string): string =>
  `${imagePath}?v=${LANDING_CONSTANTS.IMAGE_VERSION}`;

/**
 * Analytics 이벤트 이름
 */
export const ANALYTICS_EVENTS = {
  HOME: '사전신청폼',
  MEMBERSHIP: '멤버십_신청',
  SERVICE: '프로그램_신청',
  PARTY_REVIEWS: '파티후기_신청',
} as const;
