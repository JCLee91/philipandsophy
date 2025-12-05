'use client';

import { useRouter } from 'next/navigation';
import { Shield, User, RefreshCw } from 'lucide-react';
import { DialogBase } from '@/components/common/dialogs';
import { NotificationToggle } from './NotificationToggle';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useAuth } from '@/contexts/AuthContext';

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

  return (
    <DialogBase
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="설정"
      size="md"
    >
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
    </DialogBase>
  );
}
