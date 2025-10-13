/**
 * Radix UI Dialog Body Style Cleanup Manager
 *
 * 문제: Radix UI Dialog가 닫힐 때 body에 추가한 인라인 스타일이 제대로 정리되지 않아
 * CSS 미디어 쿼리(@media (display-mode: standalone))가 재적용되지 않음
 *
 * 해결: 열린 모달 개수를 추적(reference counting)하여 모든 모달이 닫혔을 때만
 * body 스타일 정리 실행
 *
 * @see https://github.com/radix-ui/primitives/issues/1548
 * @see https://github.com/radix-ui/primitives/issues/1241
 *
 * TODO: Radix UI v2.x 업그레이드 후 제거 가능 여부 확인
 */

class ModalStateManager {
  private openModals = new Set<string>();
  private rafId: number | null = null;

  /**
   * 모달 열림 등록
   */
  register(id: string): void {
    this.openModals.add(id);

    // 열리는 중이면 pending cleanup 취소
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * 모달 닫힘 등록
   */
  unregister(id: string): void {
    this.openModals.delete(id);

    // 모든 모달이 닫혔을 때만 cleanup 스케줄
    if (this.openModals.size === 0) {
      this.scheduleCleanup();
    }
  }

  /**
   * cleanup 스케줄링 (RAF로 다음 프레임에 실행)
   */
  private scheduleCleanup(): void {
    // 이전 cleanup이 있으면 취소
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      // RAF 동안 새 모달이 열렸는지 재확인
      if (this.openModals.size === 0) {
        this.cleanupBodyStyles();
      }
      this.rafId = null;
    });
  }

  /**
   * react-remove-scroll이 추가한 body 인라인 스타일 제거
   */
  private cleanupBodyStyles(): void {
    const propertiesToRemove = [
      'padding-right',
      'overflow',
      'padding-left',
      'margin-right',
      'margin-left',
      '--removed-body-scroll-bar-size',
    ] as const;

    propertiesToRemove.forEach((prop) => {
      const value = document.body.style.getPropertyValue(prop);

      // 값이 존재하고 react-remove-scroll이 설정한 것으로 보이면 제거
      if (value && this.isReactRemoveScrollValue(prop, value)) {
        document.body.style.removeProperty(prop);
      }
    });

    // 강제 reflow (브라우저가 CSS 미디어 쿼리 재계산)
    document.body.offsetHeight;
  }

  /**
   * 해당 스타일 값이 react-remove-scroll이 설정한 것인지 확인
   */
  private isReactRemoveScrollValue(prop: string, value: string): boolean {
    // overflow: hidden은 react-remove-scroll이 설정
    if (prop === 'overflow') {
      return value === 'hidden';
    }

    // padding/margin은 픽셀 값이면 react-remove-scroll이 설정
    if (prop.includes('padding') || prop.includes('margin')) {
      return value.endsWith('px') && !isNaN(parseInt(value, 10));
    }

    // 커스텀 속성은 안전하게 제거
    if (prop.startsWith('--')) {
      return true;
    }

    return false;
  }

  /**
   * 강제 cleanup (컴포넌트 unmount 시)
   */
  cleanup(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * 디버그용 - 현재 열린 모달 개수 확인
   */
  getOpenCount(): number {
    return this.openModals.size;
  }
}

// Singleton 인스턴스
export const modalManager = new ModalStateManager();
