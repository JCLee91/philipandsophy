'use client';

import { useEffect } from 'react';
import { X, Shield, User } from 'lucide-react';
import { NotificationToggle } from './NotificationToggle';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { useViewMode } from '@/contexts/ViewModeContext';
import { logger } from '@/lib/logger';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 설정 다이얼로그
 * - 모드 전환 (관리자/참가자)
 * - 알림 토글
 * - 향후 추가 설정 항목
 */
export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  useModalCleanup(isOpen);
  const { viewMode, canSwitchMode, toggleViewMode } = useViewMode();

  // 🔍 프로덕션 디버깅: 강제 로그 출력
  useEffect(() => {
    console.log('🔍 [SettingsDialog] state snapshot', {
      isOpen,
      canSwitchMode,
      viewMode,
    });
    logger.debug('[SettingsDialog] state snapshot', {
      isOpen,
      canSwitchMode,
      viewMode,
    });
  }, [isOpen, canSwitchMode, viewMode]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-lg font-bold">설정</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center h-11 w-11 -mr-2 rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:bg-gray-200"
              aria-label="닫기"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* View Mode Toggle Section - 관리자만 표시 */}
            {canSwitchMode && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">모드 전환</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {viewMode === 'admin' ? (
                        <Shield className="h-5 w-5 text-blue-600" />
                      ) : (
                        <User className="h-5 w-5 text-gray-600" />
                      )}
                      <span className="font-medium">
                        {viewMode === 'admin' ? '관리자 모드' : '참가자 모드'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleViewMode}
                      className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      style={{
                        backgroundColor: viewMode === 'admin' ? '#3B82F6' : '#9CA3AF'
                      }}
                      aria-pressed={viewMode === 'admin'}
                      aria-label="모드 전환"
                    >
                      <span
                        className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                        style={{
                          transform: viewMode === 'admin' ? 'translateX(20px)' : 'translateX(0)'
                        }}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    {viewMode === 'admin'
                      ? '관리자 권한으로 공지 작성, 수정, 삭제가 가능합니다.'
                      : '일반 참가자 화면으로 서비스를 이용합니다.'}
                  </p>
                </div>
              </div>
            )}

            {/* Notification Toggle Section */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">알림</h3>
              <NotificationToggle />
            </div>

            {/* Future: 추가 설정 항목 */}
            {/* <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">기타</h3>
              ...
            </div> */}
          </div>
        </div>
      </div>
    </>
  );
}
