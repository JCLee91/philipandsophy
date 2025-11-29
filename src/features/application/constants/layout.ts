/**
 * 설문 폼 레이아웃 상수
 * 모바일 퍼스트 - 모든 컴포넌트에서 일관된 spacing 사용
 */

// 레이아웃 상수 - 모바일 퍼스트
export const LAYOUT = {
    // 컨테이너
    MAX_WIDTH: 'max-w-xl',
    PADDING_X: 'px-6 md:px-12',

    // 상단 여백 (로고 공간 확보) - 모바일에서 축소
    HEADER_PADDING: 'pt-24 md:pt-40',

    // 하단 여백 (ProgressBar 공간 확보) - 모바일에서 축소
    FOOTER_PADDING: 'pb-24 md:pb-32',

    // 최소 높이
    MIN_HEIGHT: 'min-h-screen',

    // 입력 필드 최대 너비
    INPUT_MAX_WIDTH: 'max-w-sm',
    FILE_MAX_WIDTH: 'max-w-md',
} as const;

// ProgressBar 위치 (bottom 기준) - 모바일 퍼스트
export const PROGRESS_BAR = {
    BOTTOM: 'bottom-6 md:bottom-24', // 모바일: 24px, 데스크탑: 96px (로고 위)
    HEIGHT: 'h-1',
    MAX_WIDTH: 'max-w-[300px] md:max-w-[340px]',
} as const;

// 버튼 간격 - 모바일 퍼스트
export const BUTTON_SPACING = {
    GAP: 'gap-3 md:gap-4',
    OPTION_GAP: 'gap-2.5 md:gap-3', // single-select 옵션 간격
    SUBMIT_MARGIN: 'mt-8 md:mt-12', // 제출 버튼 상단 마진
} as const;

// 텍스트 스타일 - 모바일 퍼스트
export const TEXT_STYLES = {
    // 헤더 (intro용)
    TITLE: 'font-bold mb-4 md:mb-6 whitespace-pre-wrap leading-snug',
    TITLE_SIZE: 'text-xl md:text-2xl lg:text-3xl',
    // 본문 (질문 텍스트) - 흰색으로 가시성 확보, 여백 조정
    DESCRIPTION: 'text-base md:text-lg mb-4 md:mb-6 whitespace-pre-wrap leading-relaxed',
    DESCRIPTION_COLOR: 'text-white',
    // 서브 설명 (회색, 작은 여백)
    SUB_DESCRIPTION: 'text-sm md:text-base mb-3 md:mb-4 whitespace-pre-wrap leading-relaxed',
    SUB_DESCRIPTION_COLOR: 'text-gray-400',
} as const;
