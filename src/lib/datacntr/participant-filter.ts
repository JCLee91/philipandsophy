import type { ParticipantStatus } from '@/types/database';

/**
 * 참가자 status 기반 필터링
 * - undefined/null: legacy 데이터 → active 취급
 * - active: 항상 포함
 * - applicant: 항상 제외
 * - inactive: 항상 제외
 */
export function shouldIncludeByStatus(
  status: ParticipantStatus | undefined | null
): boolean {
  if (!status) return true; // legacy 데이터
  if (status === 'active') return true;
  return false; // applicant/inactive
}

/**
 * 데이터센터 참가자 통합 필터
 * admin/ghost + status 필터링 결합
 */
export function filterDatacntrParticipant(
  data: { isSuperAdmin?: boolean; isAdministrator?: boolean; isGhost?: boolean; status?: ParticipantStatus }
): boolean {
  if (data.isSuperAdmin || data.isAdministrator || data.isGhost) {
    return false;
  }
  return shouldIncludeByStatus(data.status);
}
