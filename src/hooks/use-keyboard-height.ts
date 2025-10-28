'use client';

import { useEffect, useState } from 'react';

/**
 * 모바일 가상 키보드 높이를 추적하는 훅
 *
 * iOS Safari와 Chrome, Android Chrome에서 키보드가 올라올 때
 * visualViewport API를 사용하여 실제 가시 영역 높이를 계산합니다.
 *
 * @returns keyboardHeight - 키보드 높이 (px)
 *
 * @example
 * ```tsx
 * const keyboardHeight = useKeyboardHeight();
 *
 * <div style={{ paddingBottom: `${keyboardHeight}px` }}>
 *   Content
 * </div>
 * ```
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // visualViewport API가 없으면 키보드 감지 불가
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const handleResize = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      // 윈도우 높이 - 가시 영역 높이 = 키보드 높이
      const height = window.innerHeight - viewport.height;

      // 키보드가 올라왔을 때만 업데이트 (50px 이상 차이)
      setKeyboardHeight(height > 50 ? height : 0);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
    };
  }, []);

  return keyboardHeight;
}
