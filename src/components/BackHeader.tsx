'use client';

import Image from 'next/image';

interface BackHeaderProps {
  onBack: () => void;
  title?: string; // 제목을 선택적으로 만듦
}

export default function BackHeader({ onBack, title }: BackHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
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
    </header>
  );
}
