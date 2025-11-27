'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { LegacyHeaderProps } from '../types';

/**
 * 레거시 헤더 컴포넌트 (V2 호환용)
 */
export function LegacyHeader({
  title,
  showBackButton = true,
  onBackClick,
}: LegacyHeaderProps) {
  const router = useRouter();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b bg-white safe-area-header">
      <div className="flex gap-3 items-center px-4 h-14">
        {showBackButton ? (
          <button
            onClick={handleBackClick}
            className="shrink-0 size-6 overflow-hidden"
            aria-label="뒤로가기"
          >
            <Image
              src="/icons/arrow-back.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        ) : (
          <div className="shrink-0 size-6" aria-hidden="true" />
        )}

        <h1
          className="flex-1 font-semibold text-lg leading-[1.4] text-black"
          style={{ letterSpacing: '-0.18px' }}
        >
          {title}
        </h1>

        <div className="shrink-0 size-6" aria-hidden="true" />
      </div>
      <style jsx>{`
        .safe-area-header {
          padding-top: env(safe-area-inset-top);
        }

        @supports (padding-top: constant(safe-area-inset-top)) {
          .safe-area-header {
            padding-top: constant(safe-area-inset-top);
          }
        }
      `}</style>
    </div>
  );
}
