'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export default function ErrorState({
  title = '오류가 발생했어요',
  message,
  onRetry,
  onBack,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-bold mb-2 text-center">{title}</h2>
      <p className="text-muted-foreground mb-6 text-center">{message}</p>
      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            다시 시도
          </Button>
        )}
        {onBack && (
          <Button onClick={onBack} variant="outline">
            돌아가기
          </Button>
        )}
      </div>
    </div>
  );
}
