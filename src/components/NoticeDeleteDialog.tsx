'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UnifiedButton from '@/components/UnifiedButton';
import type { Notice } from '@/types/database';

interface NoticeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice: Notice | null;
  onConfirm: (notice: Notice) => Promise<void>;
}

export default function NoticeDeleteDialog({
  open,
  onOpenChange,
  notice,
  onConfirm,
}: NoticeDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>공지 삭제</DialogTitle>
          <DialogDescription>
            정말로 이 공지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-3 border-t pt-4">
          <UnifiedButton variant="outline" onClick={() => onOpenChange(false)} size="sm">
            취소
          </UnifiedButton>
          <UnifiedButton
            variant="destructive"
            onClick={() => notice && onConfirm(notice)}
            size="sm"
          >
            삭제
          </UnifiedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
