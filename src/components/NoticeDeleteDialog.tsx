'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UnifiedButton from '@/components/UnifiedButton';
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 py-6 border-b">
          <DialogTitle>공지 삭제</DialogTitle>
          <DialogDescription>
            정말로 이 공지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="px-6 py-3 border-t flex-row items-center gap-2">
          <UnifiedButton
            variant="destructive"
            onClick={() => notice && onConfirm(notice)}
            loading={deleting}
            loadingText="삭제 중..."
            size="sm"
            className="ml-auto"
          >
            삭제
          </UnifiedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
