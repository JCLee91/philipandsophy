export const UI_CONSTANTS = {
  SCROLL_THRESHOLD: 50, // px - 스크롤 하단 감지 임계값
  DEBOUNCE_DELAY: 500, // ms
  CACHE_MAX_SIZE: 50,
} as const;

/**
 * Dialog/Sheet 하단 액션 영역 스타일 상수
 *
 * 모든 Dialog와 Sheet 컴포넌트의 하단 버튼 영역에서 일관된 디자인을 유지하기 위한 표준 스타일
 */
export const FOOTER_STYLES = {
  /** DialogFooter 기본 스타일 (구분선 + 버튼 간격 + 상단 패딩) */
  DIALOG_FOOTER: 'gap-3 border-t pt-4',

  /** 입력 영역 컨테이너 (DirectMessageDialog 등) */
  INPUT_CONTAINER: 'border-t p-4',

  /** Sheet 하단 액션 영역 (ParticipantsList 등) */
  SHEET_FOOTER: 'border-t p-4',

  /** 버튼 그룹 간격 */
  BUTTON_GAP: 'gap-3',

  /** 이미지 미리보기 하단 여백 */
  IMAGE_PREVIEW_MARGIN: 'mb-3',
} as const;
