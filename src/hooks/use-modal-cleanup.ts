'use client';

import { useEffect, useId } from 'react';
import { modalManager } from '@/lib/modal-manager';

/**
 * Radix UI Dialog 닫힐 때 body 스타일 정리 Hook
 *
 * 사용법:
 * ```tsx
 * function MyDialog({ open, onOpenChange }) {
 *   useModalCleanup(open);
 *
 *   return (
 *     <Dialog open={open} onOpenChange={onOpenChange}>
 *       ...
 *     </Dialog>
 *   );
 * }
 * ```
 *
 * @param open - Dialog 열림 상태
 */
export function useModalCleanup(open: boolean) {
  const modalId = useId();

  // 모달 열림/닫힘 추적
  useEffect(() => {
    if (open) {
      modalManager.register(modalId);

      return () => {
        modalManager.unregister(modalId);
      };
    }
  }, [open, modalId]);

  // 컴포넌트 unmount 시 cleanup
  useEffect(() => {
    return () => {
      modalManager.cleanup();
    };
  }, []);
}
