'use client';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = '로딩 중...' }: LoadingSpinnerProps) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
