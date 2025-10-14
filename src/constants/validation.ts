/**
 * 독서 인증 제출 검증 설정
 */
export const SUBMISSION_VALIDATION = {
  MIN_TEXT_LENGTH: 40,
  MAX_TEXT_LENGTH: 1000,
  MIN_IMAGE_SIZE: 100 * 1024, // 100KB
  MAX_IMAGE_SIZE: 50 * 1024 * 1024, // 50MB (검증 제한)
} as const;
