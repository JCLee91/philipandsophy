/**
 * 랜딩페이지 관련 상수
 */

/**
 * 랜딩페이지 공통 상수
 */
export const LANDING_CONSTANTS = {
  /** 사전 신청 폼 URL */
  FORM_URL: 'https://smore.im/form/13J1nUevrX',

  /** 이미지 캐시 버스팅 버전 */
  IMAGE_VERSION: '1762739366900',

  /** 현재 모집 중인 기수 */
  COHORT_NUMBER: 4,

  /** 마감된 기수 */
  CLOSED_COHORT_NUMBER: 3,
} as const;

/**
 * 이미지 URL 생성 헬퍼
 * @param imagePath - 이미지 경로
 * @returns 캐시 버스팅 쿼리가 포함된 이미지 URL
 */
export const getImageUrl = (imagePath: string): string =>
  `${imagePath}?v=${LANDING_CONSTANTS.IMAGE_VERSION}`;

/**
 * 툴팁 메시지
 */
export const TOOLTIP_MESSAGES = {
  /** 기수 마감 메시지 */
  CLOSED: (cohort: number) => `${cohort}기 멤버십은 마감됐어요`,

  /** 곧 오픈 메시지 */
  OPENING_SOON: (cohort: number) => `${cohort}기 모집 준비 중입니다`,
} as const;

/**
 * CTA 버튼 텍스트
 */
export const CTA_TEXTS = {
  /** 참여하기 버튼 */
  JOIN: (cohort: number) => `필립앤소피 ${cohort}기 참여하기`,
} as const;

/**
 * Analytics 이벤트 이름
 */
export const ANALYTICS_EVENTS = {
  HOME: '사전신청폼',
  MEMBERSHIP: '멤버십_신청',
  SERVICE: '프로그램_신청',
} as const;
