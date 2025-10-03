'use client';

import { ArrowLeft } from 'lucide-react';

interface BackHeaderProps {
  onBack: () => void;
  title: string;
}

export default function BackHeader({ onBack, title }: BackHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 max-w-2xl items-center px-4 relative">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors relative z-10"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none">
          {title}
        </h1>
      </div>
    </header>
  );
}
