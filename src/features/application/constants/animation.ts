/**
 * 설문 폼 애니메이션 설정
 * 모든 컴포넌트에서 일관된 애니메이션 사용
 */

// 공통 easing 함수
export const EASE_SMOOTH = [0.25, 0.46, 0.45, 0.94];

// 기본 fade 애니메이션
export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.6, ease: EASE_SMOOTH }
};

// 위로 슬라이드하며 fade in
export const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.4, ease: EASE_SMOOTH }
};

// 순차적 등장 애니메이션 (stagger) - exit 포함
export const staggerChild = (delay: number = 0) => ({
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.4, delay, ease: EASE_SMOOTH }
});

// 에러 메시지 애니메이션
export const errorAnimation = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2 }
};
