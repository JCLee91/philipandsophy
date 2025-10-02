import React from 'react';
import '../cta-button.css';

/**
 * 글래스모피즘 CTA 버튼 컴포넌트 - React 버전
 * 
 * @param {Object} props
 * @param {string} props.text - 버튼 텍스트
 * @param {string} props.href - 링크 URL (선택)
 * @param {Function} props.onClick - 클릭 핸들러 (선택)
 * @param {boolean} props.compact - 컴팩트 버전 사용 (선택)
 * @param {boolean} props.fullWidth - 전체 너비 사용 (선택)
 * @param {boolean} props.showArrow - 화살표 표시 여부 (기본: true)
 * @param {string} props.theme - 테마 ('dark' | 'light', 기본: 'dark')
 * @param {string} props.type - 버튼 타입 ('button' | 'submit' | 'reset', 선택)
 * @param {string} props.className - 추가 CSS 클래스 (선택)
 * @param {React.ReactNode} props.icon - 커스텀 아이콘 (선택)
 * @param {Object} props.style - 인라인 스타일 (선택)
 * @param {string} props.target - 링크 타겟 (선택)
 * @param {string} props.rel - 링크 rel 속성 (선택)
 */
export function GlassmorphismCTA({
    text,
    href,
    onClick,
    compact = false,
    fullWidth = false,
    showArrow = true,
    theme = 'dark',
    type,
    className = '',
    icon,
    style,
    target,
    rel
}) {
    const classNames = [
        'cta-button',
        compact && 'compact',
        fullWidth && 'full-width',
        theme === 'light' && 'theme-light',
        className
    ].filter(Boolean).join(' ');

    const defaultArrow = (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path 
                d="M9 18L15 12L9 6" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
        </svg>
    );

    const content = (
        <>
            <span className="cta-text">{text}</span>
            {showArrow && (
                <div className="cta-arrow">
                    {icon || defaultArrow}
                </div>
            )}
        </>
    );

    // 버튼 타입이 지정된 경우 button 태그 사용
    if (type) {
        return (
            <button 
                type={type}
                className={classNames}
                onClick={onClick}
                style={style}
            >
                {content}
            </button>
        );
    }

    // 기본적으로 a 태그 사용
    return (
        <a 
            href={href || '#'}
            className={classNames}
            onClick={onClick}
            style={style}
            target={target}
            rel={rel}
        >
            {content}
        </a>
    );
}

// 사용 예제
export function Example() {
    const handleClick = (e) => {
        e.preventDefault();
        console.log('CTA clicked!');
        // 여기에 분석 트래킹 추가
        // gtag('event', 'click', { event_category: 'CTA' });
    };

    return (
        <div style={{ padding: '40px', background: '#000' }}>
            {/* 기본 버전 */}
            <GlassmorphismCTA 
                text="시작하기"
                href="https://example.com"
                onClick={handleClick}
            />

            {/* 컴팩트 버전 */}
            <GlassmorphismCTA 
                text="더 알아보기"
                href="https://example.com"
                compact
            />

            {/* 풀 와이드 */}
            <GlassmorphismCTA 
                text="10월의 필립앤소피 참여하기"
                href="https://smore.im/form/13J1nUevrX"
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
            />

            {/* 화살표 없이 */}
            <GlassmorphismCTA 
                text="지금 참여하기"
                href="https://example.com"
                showArrow={false}
            />

            {/* 버튼 타입 (폼 제출용) */}
            <GlassmorphismCTA 
                text="제출하기"
                type="submit"
                onClick={handleClick}
            />

            {/* 커스텀 아이콘 */}
            <GlassmorphismCTA 
                text="다운로드"
                href="#"
                icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                }
            />

            {/* 라이트 테마 */}
            <div style={{ background: '#fff', padding: '20px' }}>
                <GlassmorphismCTA 
                    text="라이트 테마"
                    href="#"
                    theme="light"
                />
            </div>
        </div>
    );
}

export default GlassmorphismCTA;

