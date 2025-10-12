/**
 * React Query 캐시 설정 상수
 *
 * 데이터 유형별로 적절한 staleTime을 정의합니다.
 * - STATIC: 거의 변경되지 않는 정적 데이터 (cohorts, participants)
 * - SEMI_DYNAMIC: 자주 업데이트되는 동적 데이터 (notices)
 * - REAL_TIME: 실시간성이 중요한 데이터 (messages)
 */
export const CACHE_TIMES = {
  /**
   * 정적 데이터 캐시 시간: 10분
   *
   * 사용처:
   * - Cohorts: 관리자가 프로그램 사이클마다 한 번 생성
   * - Participants: 사용자가 한 번 가입, 프로필 업데이트 드묾
   */
  STATIC: 10 * 60 * 1000, // 10분

  /**
   * 준동적 데이터 캐시 시간: 1분
   *
   * 사용처:
   * - Notices: 관리자가 하루에 여러 번 게시
   * - 사용자가 새 공지를 빠르게 확인해야 하지만, 실시간일 필요는 없음
   */
  SEMI_DYNAMIC: 60 * 1000, // 1분

  /**
   * 실시간 데이터 캐시 시간: 30초
   *
   * 사용처:
   * - Messages: 사용자가 즉각적인 응답 기대
   * - Reading Submissions: 오늘의 서재 기능에서 실시간 인증 확인
   */
  REAL_TIME: 30 * 1000, // 30초
} as const;
