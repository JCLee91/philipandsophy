export const SUBMISSION_VALIDATION = {
  MIN_TEXT_LENGTH: 40,
  MAX_TEXT_LENGTH: 1000,
  MIN_IMAGE_SIZE: 100 * 1024, // 100KB
  MAX_IMAGE_SIZE: 50 * 1024 * 1024, // 50MB (검증 제한)
} as const;

/**
 * 이미지 최적화 설정 (스마트 압축)
 * - 10MB 이상만 압축 (일반 사진은 그대로)
 * - 5MB로 압축 (업로드 속도 5초 이내)
 */
export const IMAGE_OPTIMIZATION = {
  COMPRESSION_THRESHOLD: 10 * 1024 * 1024, // 10MB 이상만 압축
  TARGET_SIZE: 5, // 5MB로 압축
  MAX_DIMENSION: 1920, // Full HD (충분)
} as const;
