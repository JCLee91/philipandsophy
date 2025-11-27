'use client';

import { useMemo } from 'react';
import { useKeyboardHeight } from './use-keyboard-height';

/**
 * 모바일 키보드 상태에 따른 푸터 패딩 값을 계산하는 훅
 *
 * 키보드가 올라왔을 때와 내려갔을 때 다른 패딩 값을 반환합니다.
 * iOS safe-area-inset-bottom을 고려하여 계산됩니다.
 *
 * @returns paddingBottom - CSS padding-bottom 값 문자열
 *
 * @example
 * ```tsx
 * const footerPadding = useFooterPadding();
 *
 * <div style={{ paddingBottom: footerPadding }}>
 *   <button>Submit</button>
 * </div>
 * ```
 */
export function useFooterPadding() {
  const keyboardHeight = useKeyboardHeight();

  const paddingBottom = useMemo(
    () =>
      keyboardHeight > 0
        ? `calc(16px + env(safe-area-inset-bottom, 0px))`
        : `calc(60px + env(safe-area-inset-bottom, 0px))`,
    [keyboardHeight]
  );

  return paddingBottom;
}
