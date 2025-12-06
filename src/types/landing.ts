export interface LandingConfig {
  /** 모집 기수 (예: 5) */
  cohortNumber: number;
  
  /** 모집 상태 (모집 중 | 마감) */
  status: 'OPEN' | 'CLOSED';
  
  /** 모집 중일 때 신청 폼 타입 (자체 폼 | 외부 링크) */
  openFormType: 'INTERNAL' | 'EXTERNAL';

  /** 마감일 때 대기 폼 타입 (외부 대기 폼 | 대기 안 받음) */
  closedFormType: 'EXTERNAL_WAITLIST' | 'NONE';

  /** CTA 버튼 텍스트 (예: 필립앤소피 5기 참여하기) */
  ctaText: string;
  
  /** CTA 버튼 위 툴팁 텍스트 (예: 4기 멤버십은 마감됐어요) */
  floatingText: string;
  
  /** 
   * 외부 링크 URL
   * - openFormType === 'EXTERNAL' 일 때: 신청 폼 링크
   * - closedFormType === 'EXTERNAL_WAITLIST' 일 때: 대기 폼 링크
   */
  externalUrl: string;
  
  /** 신청 폼 URL (기본값: /application) - 내부 로직용, UI 노출 안 함 */
  applicationUrl: string;
  
  /** 모집 일정 등 부가 정보 (선택) */
  schedule?: string;

  /** 마지막 업데이트 시간 (ISO string) */
  updatedAt?: string;
  
  /** 마지막 업데이트한 관리자 이메일 */
  updatedBy?: string;

  // Deprecated fields (하위 호환성 유지를 위해 남겨둠, 추후 제거 가능)
  waitlistUrl?: string;
}

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  cohortNumber: 5,
  status: 'OPEN',
  openFormType: 'INTERNAL',
  closedFormType: 'EXTERNAL_WAITLIST',
  ctaText: '필립앤소피 5기 참여하기',
  floatingText: '4기 멤버십은 마감됐어요',
  externalUrl: 'https://tally.so/r/w71N1L', // 기본 예시
  applicationUrl: '/application',
  waitlistUrl: 'https://tally.so/r/w71N1L',
};
