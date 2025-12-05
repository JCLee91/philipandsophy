'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-react';
import { DialogBase } from './DialogBase';
import UnifiedButton from '../buttons/UnifiedButton';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  /**
   * 다이얼로그 열림 상태
   */
  open: boolean;
  /**
   * 열림 상태 변경 핸들러
   */
  onOpenChange: (open: boolean) => void;
  /**
   * 다이얼로그 제목
   */
  title: string;
  /**
   * 확인 메시지 또는 커스텀 콘텐츠
   */
  children: ReactNode;
  /**
   * 확인 버튼 텍스트
   * @default "확인"
   */
  confirmText?: string;
  /**
   * 취소 버튼 텍스트
   * @default "취소"
   */
  cancelText?: string;
  /**
   * 확인 버튼 클릭 핸들러
   */
  onConfirm: () => void | Promise<void>;
  /**
   * 확인 버튼 variant
   * @default "primary"
   */
  confirmVariant?: 'primary' | 'destructive';
  /**
   * 아이콘 타입
   * - warning: 경고 (노란색)
   * - danger: 위험/삭제 (빨간색)
   * - info: 정보 (파란색)
   * - question: 질문 (회색)
   * - none: 아이콘 없음
   */
  icon?: 'warning' | 'danger' | 'info' | 'question' | 'none';
  /**
   * 로딩 상태
   */
  loading?: boolean;
  /**
   * 로딩 중 버튼 텍스트
   */
  loadingText?: string;
}

const iconConfig = {
  warning: {
    Icon: AlertTriangle,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  danger: {
    Icon: Trash2,
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  info: {
    Icon: Info,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  question: {
    Icon: HelpCircle,
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
  },
};

/**
 * 확인 다이얼로그 컴포넌트
 *
 * 삭제, 확인 등 사용자의 의사결정이 필요한 상황에서 사용합니다.
 *
 * @example
 * // 삭제 확인
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="삭제 확인"
 *   icon="danger"
 *   confirmText="삭제"
 *   confirmVariant="destructive"
 *   onConfirm={handleDelete}
 * >
 *   정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
 * </ConfirmDialog>
 *
 * @example
 * // 일반 확인
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="변경 사항 저장"
 *   icon="question"
 *   onConfirm={handleSave}
 * >
 *   변경 사항을 저장하시겠습니까?
 * </ConfirmDialog>
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  confirmVariant = 'primary',
  icon = 'question',
  loading = false,
  loadingText,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    if (!loading) {
      onOpenChange(false);
    }
  };

  const iconInfo = icon !== 'none' ? iconConfig[icon] : null;

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={!loading}
      footer={
        <div className="flex gap-3">
          <UnifiedButton
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            fullWidth
          >
            {cancelText}
          </UnifiedButton>
          <UnifiedButton
            variant={confirmVariant}
            onClick={handleConfirm}
            loading={loading}
            loadingText={loadingText}
            fullWidth
          >
            {confirmText}
          </UnifiedButton>
        </div>
      }
    >
      <div className="p-5">
        <div className="flex flex-col items-center text-center gap-4">
          {/* Icon */}
          {iconInfo && (
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full',
                iconInfo.bgColor
              )}
            >
              <iconInfo.Icon className={cn('h-6 w-6', iconInfo.iconColor)} />
            </div>
          )}

          {/* Message */}
          <div className="text-gray-600 text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </DialogBase>
  );
}

export default ConfirmDialog;
