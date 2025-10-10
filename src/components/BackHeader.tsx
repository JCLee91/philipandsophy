'use client';

import Image from 'next/image';

interface BackHeaderProps {
  onBack: () => void;
  title?: string; // 제목을 선택적으로 만듦
}

export default function BackHeader({ onBack, title }: BackHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur safe-area-header">
      <div className="container mx-auto flex h-14 max-w-2xl items-center px-4 relative">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors duration-normal relative z-10"
          aria-label="뒤로가기"
        >
          <Image
            src="/icons/arrow-back.svg"
            alt="뒤로가기"
            width={20}
            height={20}
          />
        </button>
        {title && (
          <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none">
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
