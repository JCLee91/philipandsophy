/**
 * 에어테이블 필드명 상수
 * 에어테이블 CRM과 연동하여 합격자 자동 처리에 사용
 */

export const AIRTABLE_FIELDS = {
  /** 인터뷰 결과 (합격/불합격) */
  INTERVIEW_RESULT: '인터뷰 결과',
  /** 연락처 (전화번호) */
  PHONE_NUMBER: '연락처',
  /** 이름 */
  NAME: '이름',
  /** 웰컴 페이지 URL 저장 필드 */
  WELCOME_PAGE_URL: '월컴 페이지',
  /** 통화 스크립트 (AI 환영 메시지 생성용) */
  CALL_SCRIPT: '대화내용',
} as const;

/** 합격 상태 값 */
export const INTERVIEW_RESULT_PASS = '합격';

/** 에어테이블 API 설정 */
export const AIRTABLE_CONFIG = {
  /** API 베이스 URL */
  BASE_URL: 'https://api.airtable.com/v0',
  /** API 호출 제한 (초당 5회) */
  RATE_LIMIT_PER_SECOND: 5,
} as const;
