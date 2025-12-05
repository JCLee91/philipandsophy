'use client';

import { format, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 소셜라이징 Phase 상수
 */
export const PHASES = ['idle', 'option_vote', 'attendance_check', 'confirmed'] as const;
export type SocializingPhase = (typeof PHASES)[number];

export const PHASE_LABELS: Record<SocializingPhase, string> = {
  idle: '대기 중',
  option_vote: '선택지 투표',
  attendance_check: '참불 조사',
  confirmed: '모임 확정',
};

/**
 * 서울 핫스팟 장소 프리셋
 */
export const SEOUL_HOTSPOTS = [
  { category: '강남권', places: ['강남', '신논현', '양재', '잠실'] },
  { category: '마포권', places: ['홍대', '합정', '망원', '연남'] },
  { category: '중구/종로', places: ['을지로', '종로', '광화문', '혜화'] },
  { category: '성동/용산', places: ['성수', '건대', '이태원', '한남'] },
];

/**
 * 시간 프리셋
 */
export const TIME_PRESETS = ['18:00', '18:30', '19:00', '19:30', '20:00'];

/**
 * 날짜 문자열 포맷 (안전하게)
 */
export function formatSafeDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return dateString;
    return format(date, 'M/d(EEE)', { locale: ko });
  } catch {
    return dateString;
  }
}
