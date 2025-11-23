/**
 * Navigation utilities for type-safe route construction
 * Provides consistent URL building for app routes with query parameters
 *
 * 🔒 쿠키 및 Firebase Auth 기반 인증 (v2.4)
 * - Firebase Auth: 클라이언트 사이드 세션 유지 (localStorage)
 * - Cookies: 서버 사이드 렌더링(SSR) 보호 및 리다이렉트 처리 (pns-participant)
 */

export const appRoutes = {
  /**
   * 프로필 북 페이지
   * @param participantId - 조회할 참가자 ID
   * @param cohortId - 기수 ID
   * @param theme - 프로필 테마 (similar/opposite)
   */
  profile: (participantId: string, cohortId: string, theme?: 'similar' | 'opposite') => {
    const params = new URLSearchParams({
      cohort: cohortId,
      ...(theme && { theme }),
    });
    return `/app/profile/${participantId}?${params}`;
  },

  /**
   * 채팅 메인 페이지
   * @param cohortId - 기수 ID
   */
  chat: (cohortId: string) => {
    const params = new URLSearchParams({
      cohort: cohortId,
    });
    return `/app/chat?${params}`;
  },

  /**
   * 오늘의 서재 페이지
   * @param cohortId - 기수 ID
   */
  todayLibrary: (cohortId: string) => {
    const params = new URLSearchParams({
      cohort: cohortId,
    });
    return `/app/chat/today-library?${params}`;
  },

  /**
   * 참가자 목록 전용 페이지 (iOS PWA fallback)
   * @param cohortId - 기수 ID
   */
  participants: (cohortId: string) => {
    const params = new URLSearchParams({
      cohort: cohortId,
    });
    return `/app/chat/participants?${params}`;
  },

  /**
   * 프로그램 소개 페이지
   * @param cohortId - 기수 ID
   */
  program: (cohortId: string) => {
    const params = new URLSearchParams({
      cohort: cohortId,
    });
    return `/app/program?${params}`;
  },

  /**
   * 독서 인증 Step 1 - 이미지 업로드
   * @param cohortId - 기수 ID
   */
  submitStep1: (cohortId: string) => {
    const params = new URLSearchParams({
      cohort: cohortId,
    });
    return `/app/submit/step1?${params}`;
  },

  /**
   * 독서 인증 Step 2 - 책 제목
   */
  submitStep2: '/app/submit/step2',

  /**
   * 독서 인증 Step 3 - 질문 답변
   */
  submitStep3: '/app/submit/step3',
} as const;
