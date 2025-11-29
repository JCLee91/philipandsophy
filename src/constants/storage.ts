/**
 * Firebase Storage 경로 상수
 *
 * 모든 업로드 함수가 동일한 경로 규칙을 따르도록 강제
 */

export const STORAGE_PATHS = {
  /**
   * 독서 인증 이미지
   * reading_submissions/{participationCode}/{fileName}
   */
  READING_SUBMISSION: (participationCode: string, fileName: string) =>
    `reading_submissions/${participationCode}/${fileName}`,

  /**
   * 공지사항 이미지
   * notices/{cohortId}/{fileName}
   */
  NOTICE: (cohortId: string, fileName: string) =>
    `notices/${cohortId}/${fileName}`,

  /**
   * 다이렉트 메시지 이미지
   * direct_messages/{userId}/{fileName}
   */
  DIRECT_MESSAGE: (userId: string, fileName: string) =>
    `direct_messages/${userId}/${fileName}`,

  /**
   * 프로필 이미지
   * profiles/{participantId}/{fileName}
   */
  PROFILE: (participantId: string, fileName: string) =>
    `profiles/${participantId}/${fileName}`,

  /**
   * 신청서 사진
   * applications/{timestamp}_{fileName}
   */
  APPLICATION: (fileName: string) =>
    `applications/${fileName}`,
} as const;

/**
 * 파일명 생성 (타임스탬프 + 원본 파일명)
 */
export function generateStorageFileName(originalName: string): string {
  const timestamp = Date.now();
  return `${timestamp}_${originalName}`;
}
