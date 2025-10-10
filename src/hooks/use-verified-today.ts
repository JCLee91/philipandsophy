'use client';

/**
 * 오늘 독서 인증을 완료한 참가자 ID 목록을 실시간으로 추적하는 hook
 * - Zustand store를 통한 전역 상태 관리로 여러 컴포넌트 간 구독 공유
 * - Firebase 실시간 구독으로 인증 즉시 반영
 * - 탭 복귀 시 날짜 변화 자동 체크 (Page Visibility API)
 * - 1분마다 날짜 변화 체크 (자정 감지)
 *
 * @deprecated 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새 코드에서는 @/stores/verified-today의 useVerifiedToday를 직접 사용하세요.
 */
export { useVerifiedToday } from '@/stores/verified-today';
