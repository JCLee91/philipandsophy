'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useVerifiedToday } from '@/stores/verified-today';

/**
 * 접근 제어 상태 및 유틸리티
 */
export interface AccessControlResult {
  /** 현재 사용자 ID */
  userId: string | undefined;
  /** 오늘 인증 완료 여부 */
  isVerified: boolean;
  /** 관리자 권한 여부 */
  isAdmin: boolean;
  /** 콘텐츠 잠금 상태 (인증 안 함 + 관리자 아님) */
  isLocked: boolean;
  /** 본인 프로필 확인 함수 */
  isSelf: (targetId: string) => boolean;
}

/**
 * 접근 제어 및 인증 상태 관리 훅
 *
 * 오늘의 서재와 프로필북에서 일관된 접근 제어를 위한 중앙화된 훅입니다.
 * 사용자의 인증 상태, 관리자 권한, 잠금 상태를 관리합니다.
 *
 * @returns 접근 제어 상태 및 유틸리티
 *
 * @example
 * // 오늘의 서재에서 사용
 * const { isLocked, isAdmin, isVerified } = useAccessControl();
 * if (isLocked) return <LockedScreen />;
 *
 * @example
 * // 프로필북에서 사용
 * const { isSelf, isAdmin } = useAccessControl();
 * const canEdit = isSelf(participantId) || isAdmin;
 */
export function useAccessControl(): AccessControlResult {
  const { participant } = useAuth();
  const { data: verifiedIds } = useVerifiedToday();

  const userId = participant?.id;
  const isVerified = verifiedIds?.has(userId || '') ?? false;
  const isAdmin = participant?.isAdmin === true;
  const isLocked = !isAdmin && !isVerified;

  const isSelf = (targetId: string) => userId === targetId;

  return {
    userId,
    isVerified,
    isAdmin,
    isLocked,
    isSelf,
  };
}
