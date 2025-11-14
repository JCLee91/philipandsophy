'use client';

import { useMemo } from 'react';
import { useAccessControl } from './use-access-control';
import { useSubmissionsByParticipant } from './use-submissions';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 프로필북 접근 제어 결과
 */
export interface ProfileBookAccessResult {
  /** 누적 인증 횟수 */
  cumulativeSubmissionCount: number;
  /** 받을 수 있는 총 프로필북 개수 (2 × (누적인증 + 2)) */
  totalProfileBooks: number;
  /** 열람 가능한 프로필북 개수 (오늘 인증: 전체, 미인증: 2개) */
  unlockedProfileBooks: number;
  /** 오늘 인증 여부 */
  isVerifiedToday: boolean;
  /** 슈퍼 관리자 여부 */
  isSuperAdmin: boolean;
  /** 콘텐츠 잠금 상태 */
  isLocked: boolean;
  /** 로딩 상태 */
  isLoading: boolean;
}

/**
 * 프로필북 접근 제어 훅 (v2.0 - 랜덤 매칭)
 *
 * 누적 인증 횟수에 따라 받을 수 있는 프로필북 개수를 계산합니다.
 * - 프로필북 개수: 2 × (누적인증 + 2)
 * - 오늘 인증 O → 전체 열람 가능
 * - 오늘 인증 X → 2개만 열람 가능 (남1+여1)
 *
 * @param cohortId 기수 ID (해당 기수 내에서만 인증 횟수 카운트)
 * @returns 프로필북 접근 제어 정보
 *
 * @example
 * const { totalProfileBooks, unlockedProfileBooks, isVerifiedToday } = useProfileBookAccess('3');
 *
 * console.log(`총 ${totalProfileBooks}개 중 ${unlockedProfileBooks}개 열람 가능`);
 */
export function useProfileBookAccess(cohortId?: string): ProfileBookAccessResult {
  const { userId, isVerified, isSuperAdmin, isLocked } = useAccessControl();
  const { participant } = useAuth();

  // 사용자의 모든 제출물 조회
  const { data: submissions, isLoading } = useSubmissionsByParticipant(userId);

  // 누적 인증 횟수 계산 (현재 기수만, submissionDate 기준 중복 제거)
  const cumulativeSubmissionCount = useMemo(() => {
    if (!submissions || !participant) return 0;

    // participationCode가 없으면 participant.id로 fallback (제출 플로우와 동일)
    const participationCode = participant.participationCode || participant.id;

    // 현재 기수의 승인된 제출물만 카운트
    const approvedSubmissions = submissions.filter(
      (s) => s.status === 'approved' &&
            s.submissionDate &&
            s.participationCode === participationCode &&
            (!cohortId || s.cohortId === cohortId) // cohortId로 필터링
    );

    // submissionDate 기준 중복 제거
    const uniqueDates = new Set(
      approvedSubmissions.map((s) => s.submissionDate)
    );

    return uniqueDates.size;
  }, [submissions, participant?.participationCode, participant?.id, cohortId]);

  // 받을 수 있는 총 프로필북 개수: 2 × (누적인증 + 2)
  const totalProfileBooks = 2 * (cumulativeSubmissionCount + 2);

  // 열람 가능한 프로필북 개수
  const unlockedProfileBooks = useMemo(() => {
    // 슈퍼 관리자는 모든 프로필 열람 가능
    if (isSuperAdmin) {
      return Infinity;
    }

    // 오늘 인증 완료 → 할당된 모든 프로필북 열람 가능
    if (isVerified) {
      return Infinity;
    }

    // 오늘 미인증 → 2개만 열람 가능
    return 2;
  }, [isSuperAdmin, isVerified]);

  return {
    cumulativeSubmissionCount,
    totalProfileBooks,
    unlockedProfileBooks,
    isVerifiedToday: isVerified,
    isSuperAdmin,
    isLocked,
    isLoading,
  };
}

/**
 * 프로필북 잠금 상태 확인
 *
 * @param index 프로필북 인덱스 (0부터 시작)
 * @param access 프로필북 접근 제어 정보
 * @returns 잠금 여부
 *
 * @example
 * const access = useProfileBookAccess();
 * const isLocked = isProfileBookLocked(5, access); // 6번째 프로필북 잠금 여부
 */
export function isProfileBookLocked(
  index: number,
  access: ProfileBookAccessResult
): boolean {
  // 슈퍼 관리자는 모두 열람 가능
  if (access.isSuperAdmin) {
    return false;
  }

  // 인덱스가 열람 가능 개수 미만이면 열림
  return index >= access.unlockedProfileBooks;
}
