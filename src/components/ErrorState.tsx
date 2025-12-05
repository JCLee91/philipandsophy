'use client';

/**
 * @deprecated Use `import { EmptyState } from '@/components/common'` instead
 *
 * This component is kept for backward compatibility.
 * New code should use EmptyState with variant="error" or layout="fullPage"
 */

import { EmptyState } from '@/components/common/states/EmptyState';
import UnifiedButton from '@/components/common/buttons/UnifiedButton';

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
    <EmptyState
      icon="error"
      title={title}
      description={message}
      layout="fullPage"
      actions={
        <>
          {onRetry && <UnifiedButton onClick={onRetry}>다시 시도</UnifiedButton>}
          {onBack && (
            <UnifiedButton onClick={onBack} variant="outline">
              돌아가기
            </UnifiedButton>
          )}
        </>
      }
    />
  );
}
