/**
 * Z-Index 계층 구조 표준화
 *
 * 프로젝트 전체에서 일관된 z-index 사용을 위한 상수 정의
 * 숫자가 높을수록 상위 레이어
 */

export const Z_INDEX = {
  // 최상위 레벨 (10000+) - 이미지 뷰어 등 모든 것 위에 표시
  IMAGE_VIEWER_CONTENT: 10001,
  IMAGE_VIEWER_BACKDROP: 10000,

  // 다이얼로그/모달 레벨 (9000-9999)
  MODAL_BACKDROP: 9999,
  MODAL_CONTENT: 9999,
  DM_DIALOG: 9999,
  NOTIFICATION: 9999,

  // 드롭다운 메뉴 레벨 (1100)
  DROPDOWN_MENU: 1100,

  // 시트/사이드바 레벨 (999-1000)
  SHEET_CONTENT: 1000,
  SHEET_BACKDROP: 999,
  HEADER: 999,
  BACK_HEADER: 999,

  // 고정 헤더/스텝 레벨 (998)
  STEP_HEADER: 998,

  // 토스트 레벨 (100)
  TOAST: 100,

  // 일반 모달/팝업 레벨 (50)
  POPUP: 50,
  SPLASH_SCREEN: 50,
  SETTINGS_DIALOG: 50,
  HEADER_NAVIGATION: 50,
  LOCKED_SCREEN: 50,
  TEMPLATE_MODAL: 50,
  AUTOCOMPLETE: 50,

  // 사이드바 레벨 (40)
  SIDEBAR_OVERLAY: 40,
  SIDEBAR: 40,

  // 중간 레벨 (10-20)
  BOOKMARK_CARD_TOP: 20,
  DROPDOWN: 10,
  BOOKMARK_ROW: 10,
  STICKY_ELEMENT: 10,
  PROFILE_ELEMENT: 10,

  // 최하위 레벨 (0)
  BASE: 0,
} as const;

// Tailwind 클래스명으로 변환하는 헬퍼 함수
export function getZIndexClass(level: keyof typeof Z_INDEX): string {
  const value = Z_INDEX[level];
  return `z-[${value}]`;
}

// 타입 정의
export type ZIndexLevel = keyof typeof Z_INDEX;