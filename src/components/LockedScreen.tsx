'use client';

import { ArrowLeft, Lock, BookOpen } from 'lucide-react';

interface LockedScreenProps {
  onBack: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
}

export default function LockedScreen({
  onBack,
  title = '프로필 북',
  message = '다른 참가자의 프로필 북을 보려면\n오늘의 독서 인증을 완료해야 해요.',
  buttonText = '돌아가기',
}: LockedScreenProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* 헤더 */}
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

      {/* 잠금 화면 */}
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold">
            {title === '오늘의 서재' ? '오늘의 서재가 잠겨있어요' : '프로필 북이 잠겨있어요'}
          </h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {message}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            {buttonText}
          </button>
        </div>
      </main>
    </div>
  );
}
