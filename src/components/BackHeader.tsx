'use client';

import Image from 'next/image';

interface BackHeaderProps {
  onBack: () => void;
  title?: string;
  variant?: 'center' | 'left'; // 중앙 정렬 or 왼쪽 정렬
}

export default function BackHeader({ onBack, title, variant = 'center' }: BackHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-[999] border-b bg-background safe-area-header isolate">
      <div className="container mx-auto flex h-14 items-center px-6 relative">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center -ml-3 hover:bg-muted rounded-lg transition-colors duration-normal relative z-10"
          aria-label="뒤로가기"
        >
          <Image
            src="/icons/arrow-back.svg"
            alt="뒤로가기"
            width={20}
            height={20}
          />
        </button>
        {title && variant === 'center' && (
          <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none">
            {title}
          </h1>
        )}
        {title && variant === 'left' && (
          <h1 className="ml-2 text-lg font-bold">
            {title}
          </h1>
        )}
      </div>
      <style jsx>{`
        .safe-area-header {
          padding-top: env(safe-area-inset-top);
        }

        /* iOS 11.2 이전 버전 호환성 */
        @supports (padding-top: constant(safe-area-inset-top)) {
          .safe-area-header {
            padding-top: constant(safe-area-inset-top);
          }
        }
      `}</style>
    </header>
  );
}
