'use client';

import { ConfirmDialog } from '@/components/common/dialogs';
import type { Notice } from '@/types/database';

interface NoticeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice: Notice | null;
  onConfirm: (notice: Notice) => Promise<void>;
  deleting?: boolean;
}

export default function NoticeDeleteDialog({
  open,
  onOpenChange,
  notice,
  onConfirm,
  deleting = false,
}: NoticeDeleteDialogProps) {
  const handleConfirm = async () => {
    if (notice) {
      await onConfirm(notice);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="공지 삭제"
      icon="danger"
      confirmText="삭제"
      confirmVariant="destructive"
      onConfirm={handleConfirm}
      loading={deleting}
      loadingText="삭제 중..."
    >
      정말로 이 공지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
    </ConfirmDialog>
  );
}
