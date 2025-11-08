'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Shield, User, RefreshCw } from 'lucide-react';
import { NotificationToggle } from './NotificationToggle';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userCohorts?: Array<{ cohortId: string; cohortName: string }>;
}

/**
 * 설정 다이얼로그
 * - 모드 전환 (관리자/참가자)
 * - 알림 토글
 * - 기수 변경 (여러 코호트 참가 시)
 */
export default function SettingsDialog({ isOpen, onClose, userCohorts = [] }: SettingsDialogProps) {
  useModalCleanup(isOpen);
  const router = useRouter();
  const { participant } = useAuth();
  const { viewMode, canSwitchMode, toggleViewMode } = useViewMode();

  // 관리자 여부 확인
  const isAdmin = participant?.isAdministrator || participant?.isSuperAdmin;

  // 여러 코호트 참가 여부 (관리자 또는 2개 이상 참가)
  const hasMultipleCohorts = isAdmin || userCohorts.length > 1;

  // 코호트 변경 페이지로 이동
  const handleChangeCohort = () => {
    onClose();
    router.push('/app/cohorts');
  };

  // 🔍 프로덕션 디버깅: 강제 로그 출력
  useEffect(() => {

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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {viewMode === 'admin' ? (
                      <Shield className="h-5 w-5 text-gray-900" />
                    ) : (
                      <User className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {viewMode === 'admin' ? '관리자 모드' : '참가자 모드'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {viewMode === 'admin'
                          ? '공지 작성, 수정, 삭제 가능'
                          : '일반 참가자 화면으로 이용'}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="relative h-6 w-11">
                    <button
                      type="button"
                      onClick={toggleViewMode}
                      className={`absolute inset-0 inline-flex h-6 w-11 items-center rounded-full transition-colors duration-normal ${
                        viewMode === 'admin' ? 'bg-black' : 'bg-gray-200'
                      } cursor-pointer`}
                      role="switch"
                      aria-checked={viewMode === 'admin'}
                      aria-label="모드 전환"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-normal ${
                          viewMode === 'admin' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
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

            {/* Cohort Change Section - 여러 코호트 참가자 또는 관리자에게 표시 */}
            {hasMultipleCohorts && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  {isAdmin ? '관리자 메뉴' : '기수 관리'}
                </h3>
                <button
                  type="button"
                  onClick={handleChangeCohort}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 font-medium text-black transition-colors hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-gray-600" />
                    <span>기수 변경</span>
                  </div>
                  <span className="text-sm text-gray-500">›</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
