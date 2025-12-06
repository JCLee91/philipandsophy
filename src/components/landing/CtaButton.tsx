'use client';

import Link from 'next/link';
import Tooltip from '@/components/Tooltip';
import { LANDING_CONSTANTS, CTA_TEXTS, TOOLTIP_MESSAGES } from '@/constants/landing';
import { trackEvent } from '@/lib/analytics';

interface CtaButtonProps {
  /** Analytics 이벤트에 사용될 콘텐츠 이름 */
  analyticsName: string;

  /** aria-label 속성 값 */
  ariaLabel: string;

  /** 버튼 텍스트 (기본값: 현재 기수 참여하기) */
  text?: string;

  /** 링크 URL (기본값: LANDING_CONSTANTS.FORM_URL) */
  href?: string;

  /** 툴팁 텍스트 (기본값: 마감된 기수 메시지) */
  floatingText?: string;
}

/**
 * 랜딩페이지 CTA(Call-to-Action) 버튼 컴포넌트
 *
 * 툴팁과 함께 표시되는 참여하기 버튼
 * Facebook Pixel 트래킹 이벤트 포함
 */
export default function CtaButton({
  analyticsName,
  ariaLabel,
  text = CTA_TEXTS.JOIN(LANDING_CONSTANTS.COHORT_NUMBER),
  href = LANDING_CONSTANTS.FORM_URL,
  floatingText = TOOLTIP_MESSAGES.CLOSED(LANDING_CONSTANTS.CLOSED_COHORT_NUMBER),
}: CtaButtonProps) {
  const isInternal = href.startsWith('/');
  const isDisabled = href === '#';

  if (isDisabled) {
    return (
      <div className="cta-section">
        <Tooltip message={floatingText} />
        <button
          aria-label={ariaLabel}
          className="cta-button opacity-50 cursor-not-allowed"
          disabled
        >
          <span className="cta-text">{text}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="cta-section">
      <Tooltip message={floatingText} />
      {isInternal ? (
        <Link
          href={href}
          aria-label={ariaLabel}
          className="cta-button"
          onClick={() => trackEvent('Lead', analyticsName)}
        >
          <span className="cta-text">{text}</span>
        </Link>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          className="cta-button"
          onClick={() => trackEvent('Lead', analyticsName)}
        >
          <span className="cta-text">{text}</span>
        </a>
      )}
    </div>
  );
}
