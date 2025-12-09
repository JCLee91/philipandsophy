export const FUNNEL_STEPS = [
  // 온보딩 단계 (공통)
  { stepId: 'onboarding_video', stepIndex: 0, label: '온보딩 영상' },
  { stepId: 'onboarding_step_1', stepIndex: 1, label: '검증된 사람들' },
  { stepId: 'onboarding_step_2', stepIndex: 2, label: '2주간 독서' },
  { stepId: 'onboarding_step_3', stepIndex: 3, label: '클로징 파티' },
  // 신청폼 단계 (신규 회원)
  { stepId: 'intro', stepIndex: 4, label: '인트로' },
  { stepId: 'membership_status', stepIndex: 5, label: '회원 유형 선택' },
  { stepId: 'personal_info', stepIndex: 6, label: '기본 정보' },
  { stepId: 'job_info', stepIndex: 7, label: '직장 정보' },
  { stepId: 'channel', stepIndex: 8, label: '유입 채널' },
  { stepId: 'photo', stepIndex: 9, label: '사진 업로드' },
  { stepId: 'birthdate', stepIndex: 10, label: '생년월일' },
  { stepId: 'submit', stepIndex: 11, label: '제출 완료' },
] as const;

export const EXISTING_MEMBER_FUNNEL_STEPS = [
  // 온보딩 단계 (공통)
  { stepId: 'onboarding_video', stepIndex: 0, label: '온보딩 영상' },
  { stepId: 'onboarding_step_1', stepIndex: 1, label: '검증된 사람들' },
  { stepId: 'onboarding_step_2', stepIndex: 2, label: '2주간 독서' },
  { stepId: 'onboarding_step_3', stepIndex: 3, label: '클로징 파티' },
  // 신청폼 단계 (기존 회원)
  { stepId: 'intro', stepIndex: 4, label: '인트로' },
  { stepId: 'membership_status', stepIndex: 5, label: '회원 유형 선택' },
  { stepId: 'cohort_check', stepIndex: 6, label: '기수 확인' },
  { stepId: 'personal_info_existing', stepIndex: 7, label: '기본 정보' },
  { stepId: 'submit', stepIndex: 8, label: '제출 완료' },
] as const;

export type PeriodFilter = 'today' | '7days' | '30days' | 'all';
