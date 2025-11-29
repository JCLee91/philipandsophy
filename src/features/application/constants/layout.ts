/**
 * 설문 폼 레이아웃 상수
 * 모든 컴포넌트에서 일관된 spacing 사용
 */

// 레이아웃 상수
export const LAYOUT = {
    // 컨테이너
    MAX_WIDTH: 'max-w-xl',
    PADDING_X: 'px-8 md:px-12',

    // 상단 여백 (로고 공간 확보)
    HEADER_PADDING: 'pt-48 md:pt-56',

    // 하단 여백 (ProgressBar 공간 확보)
    FOOTER_PADDING: 'pb-40',

    // 최소 높이
    MIN_HEIGHT: 'min-h-screen',

    // 입력 필드 최대 너비
    INPUT_MAX_WIDTH: 'max-w-sm',
    FILE_MAX_WIDTH: 'max-w-md',
} as const;

// ProgressBar 위치 (bottom 기준)
export const PROGRESS_BAR = {
    BOTTOM: 'bottom-32', // 로고 푸터 위 (120px → 128px 정리)
    HEIGHT: 'h-1',
    MAX_WIDTH: 'max-w-[340px]',
} as const;

// 버튼 간격
export const BUTTON_SPACING = {
    GAP: 'gap-4',
    OPTION_GAP: 'gap-3', // single-select 옵션 간격
} as const;

// 텍스트 스타일
export const TEXT_STYLES = {
    // 헤더 (intro용)
    TITLE: 'font-bold mb-6 whitespace-pre-wrap leading-snug',
    TITLE_SIZE: 'text-2xl md:text-3xl',
    // 본문 (질문 텍스트) - 흰색으로 가시성 확보, 여백 조정
    DESCRIPTION: 'text-lg mb-6 whitespace-pre-wrap leading-relaxed',
    DESCRIPTION_COLOR: 'text-white',
    // 서브 설명 (회색, 작은 여백)
    SUB_DESCRIPTION: 'text-base mb-4 whitespace-pre-wrap leading-relaxed',
    SUB_DESCRIPTION_COLOR: 'text-gray-400',
} as const;
