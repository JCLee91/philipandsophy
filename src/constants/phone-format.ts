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
} as const;