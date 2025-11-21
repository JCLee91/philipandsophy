/**
 * Shared type definitions for matching system
 *
 * @version 1.0.0
 * @date 2025-11-21
 */

/**
 * 참가자 정보 (누적 인증 횟수 포함)
 */
export interface ParticipantWithSubmissionCount {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  submissionCount: number; // 누적 인증 횟수
}
