import { PHONE_VALIDATION, AUTH_ERROR_MESSAGES } from './auth';

/**
 * 전화번호 포맷팅 유틸리티
 * 한국 휴대폰 번호 형식 처리
 */
export const phoneFormatUtils = {
  /**
   * 전화번호 포맷팅 (입력 중)
   * 01012345678 → 010-1234-5678
   *
   * @param value - 입력 중인 전화번호
   * @returns 포맷팅된 전화번호
   */
  formatAsTyping(value: string): string {
    const numbers = value.replace(/[^\d]/g, '');

    if (numbers.length <= 3) {
      return numbers;
    }

    if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    }

    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  },

  /**
   * E.164 → 디스플레이 형식
   * +821012345678 → 010-1234-5678
   *
   * @param e164Number - E.164 형식 전화번호
   * @returns 디스플레이용 전화번호
   */
  toDisplay(e164Number: string): string {
    if (!e164Number.startsWith(PHONE_VALIDATION.COUNTRY_CODE)) {
      return e164Number;
    }

    const withoutPrefix = '0' + e164Number.slice(3);

    if (withoutPrefix.length !== PHONE_VALIDATION.PHONE_LENGTH) {
      return e164Number;
    }

    return `${withoutPrefix.slice(0, 3)}-${withoutPrefix.slice(3, 7)}-${withoutPrefix.slice(7, 11)}`;
  },

  /**
   * 디스플레이 형식 → E.164
   * 010-1234-5678 → +821012345678
   *
   * @param phoneNumber - 한국 전화번호
   * @returns E.164 형식 전화번호
   * @throws 유효하지 않은 전화번호일 경우
   */
  toE164(phoneNumber: string): string {
    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');

    if (
      !cleanNumber.startsWith(PHONE_VALIDATION.KOREAN_PREFIX) ||
      cleanNumber.length !== PHONE_VALIDATION.PHONE_LENGTH
    ) {
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_PHONE_SHORT);
    }

    return `${PHONE_VALIDATION.COUNTRY_CODE}${cleanNumber.slice(1)}`;
  },

  /**
   * 한국 휴대폰 번호 검증 (하이픈 제거 후)
   *
   * @param phone - 검증할 전화번호
   * @returns 유효한 한국 전화번호인지 여부
   */
  isValidKoreanPhone(phone: string): boolean {
    const clean = phone.replace(/[^\d]/g, '');
    return clean.startsWith(PHONE_VALIDATION.KOREAN_PREFIX) &&
           clean.length === PHONE_VALIDATION.PHONE_LENGTH;
  },

  /**
   * E.164 형식 검증
   *
   * @param phone - 검증할 전화번호
   * @returns 유효한 E.164 형식인지 여부
   */
  isValidE164(phone: string): boolean {
    return phone.startsWith(PHONE_VALIDATION.COUNTRY_CODE) &&
           phone.length === 13; // +821012345678
  },

  /**
   * 다양한 전화번호 형식을 한국 표준 형식으로 정규화
   *
   * 지원 형식:
   * - 010-1234-5678 (하이픈)
   * - 01012345678 (숫자만)
   * - +821012345678 (국제 형식 +82)
   * - 821012345678 (국제 형식 82)
   * - 0821012345678 (국제 형식 082)
   *
   * @param phone - 정규화할 전화번호
   * @returns 정규화된 전화번호 (01012345678 형식) 또는 null (유효하지 않은 경우)
   */
  normalize(phone: string): string | null {
    if (!phone) return null;

    // 모든 특수문자 제거 (하이픈, 공백, 괄호 등)
    let cleanNumber = phone.replace(/[^\d+]/g, '');

    // +82로 시작하는 경우 → 010으로 변환
    if (cleanNumber.startsWith('+82')) {
      cleanNumber = '0' + cleanNumber.slice(3);
    }
    // 82로 시작하는 경우 (+ 없이) → 010으로 변환
    else if (cleanNumber.startsWith('82') && cleanNumber.length >= 12) {
      cleanNumber = '0' + cleanNumber.slice(2);
    }
    // 082로 시작하는 경우 → 010으로 변환
    else if (cleanNumber.startsWith('082')) {
      cleanNumber = cleanNumber.slice(1); // 082 → 82 → 이후 위의 로직 재사용
      if (cleanNumber.startsWith('82')) {
        cleanNumber = '0' + cleanNumber.slice(2);
      }
    }

    // 유효성 검증: 01로 시작하고 11자리
    if (!cleanNumber.startsWith(PHONE_VALIDATION.KOREAN_PREFIX) ||
        cleanNumber.length !== PHONE_VALIDATION.PHONE_LENGTH) {
      return null;
    }

    return cleanNumber;
  },

  /**
   * 전화번호 정규화 및 유효성 검증 (에러 메시지 포함)
   *
   * @param phone - 검증할 전화번호
   * @returns { valid: boolean, normalized: string | null, error: string | null }
   */
  validateAndNormalize(phone: string): {
    valid: boolean;
    normalized: string | null;
    error: string | null;
  } {
    if (!phone || !phone.trim()) {
      return {
        valid: false,
        normalized: null,
        error: '전화번호를 입력해주세요',
      };
    }

    const normalized = this.normalize(phone);

    if (!normalized) {
      return {
        valid: false,
        normalized: null,
        error: '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)',
      };
    }

    return {
      valid: true,
      normalized,
      error: null,
    };
  },
} as const;