'use client';

import { X } from 'lucide-react';
import { NotificationToggle } from './NotificationToggle';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 설정 다이얼로그
 * - 알림 토글
 * - 향후 추가 설정 항목
 */
export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
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
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
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
