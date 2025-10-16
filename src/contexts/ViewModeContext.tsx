'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { logger } from '@/lib/logger';
import { APP_CONSTANTS } from '@/constants/app';

export type ViewMode = 'participant' | 'admin';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  canSwitchMode: boolean; // 관리자 권한이 있어서 모드 전환 가능한지
  toggleViewMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const [viewMode, setViewModeState] = useState<ViewMode>('participant');

  // 관리자 권한이 있는지 확인
  const canSwitchMode = !isLoading && currentUser?.isAdministrator === true;

  useEffect(() => {
    logger.debug('[ViewModeContext] canSwitchMode evaluation', {
      isLoading,
      userId: currentUser?.id,
      isAdministrator: currentUser?.isAdministrator,
      computedCanSwitchMode: canSwitchMode,
    });
  }, [isLoading, currentUser?.id, currentUser?.isAdministrator, canSwitchMode]);

  // 디버깅: 권한 체크 로그
  useEffect(() => {
    if (!isLoading && currentUser) {
      logger.debug('ViewMode 권한 체크:', {
        userId: currentUser.id,
        userName: currentUser.name,
        isAdministrator: currentUser.isAdministrator,
        canSwitchMode,
      });
    }
  }, [isLoading, currentUser, canSwitchMode]);

  // 컴포넌트 마운트 시 localStorage에서 모드 복원
  useEffect(() => {
    if (isLoading) return;

    // localStorage에서 저장된 모드 읽기
    const savedMode = localStorage.getItem(APP_CONSTANTS.STORAGE_KEY_VIEW_MODE) as ViewMode | null;

    if (savedMode && canSwitchMode) {
      // 관리자이고 저장된 모드가 있으면 복원
      setViewModeState(savedMode);
      logger.debug('[ViewModeContext] saved mode restored', { mode: savedMode });
    } else if (!canSwitchMode) {
      // 관리자가 아니면 항상 참가자 모드
      setViewModeState('participant');
      localStorage.removeItem(APP_CONSTANTS.STORAGE_KEY_VIEW_MODE);
      logger.debug('[ViewModeContext] forced participant mode (insufficient permission)');
    } else {
      logger.debug('[ViewModeContext] using default participant mode');
    }
  }, [canSwitchMode, isLoading]);

  // 모드 설정 함수
  const setViewMode = (mode: ViewMode) => {
    if (!canSwitchMode && mode === 'admin') {
      logger.warn('[ViewModeContext] 관리자 권한이 없어 모드 전환 불가', {
        requestedMode: mode,
        canSwitchMode,
      });
      return;
    }

    setViewModeState(mode);
    localStorage.setItem(APP_CONSTANTS.STORAGE_KEY_VIEW_MODE, mode);
    logger.info('[ViewModeContext] view mode 변경', { mode });
  };

  // 모드 토글 함수
  const toggleViewMode = () => {
    const newMode = viewMode === 'participant' ? 'admin' : 'participant';
    setViewMode(newMode);
  };

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        setViewMode,
        canSwitchMode,
        toggleViewMode
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}

/**
 * 현재 관리자 모드인지 확인하는 훅
 * 관리자 권한이 있고, 관리자 모드로 설정되어 있을 때만 true
 */
export function useIsAdminMode() {
  const { viewMode, canSwitchMode } = useViewMode();
  return canSwitchMode && viewMode === 'admin';
}
