'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import UnifiedButton from '@/components/UnifiedButton';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { useDraftStorage, confirmCloseDialog } from '@/hooks/use-draft-storage';
import { useEffect } from 'react';

interface NoticeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => Promise<void>;
  saving?: boolean;
}

export default function NoticeEditDialog({
  open,
  onOpenChange,
  content,
  onContentChange,
  onSave,
  saving = false,
}: NoticeEditDialogProps) {
  useModalCleanup(open);

  // 임시 저장
  const { restore, clear } = useDraftStorage(
    'notice-edit-draft',
    { content },
    true
  );

  // 다이얼로그 열릴 때 임시 저장 내용 복원
  useEffect(() => {
    if (open) {
      const draft = restore();
      if (draft?.content) {
        onContentChange(draft.content);
      }
    }
  }, [open]);

  const handleSave = async () => {
    await onSave();
    clear(); // 저장 성공 시 임시 저장 내용 삭제
  };

  const handleClose = (newOpen: boolean) => {
    // 닫으려고 할 때만 확인
    if (!newOpen) {
      const hasContent = content.trim().length > 0;
      if (!confirmCloseDialog(hasContent)) {
        return; // 사용자가 취소하면 닫지 않음
      }
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg md:max-w-2xl p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 py-6 border-b">
          <DialogTitle>공지 수정</DialogTitle>
          <DialogDescription>
            공지 내용을 수정하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4">
          <Textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="min-h-[120px] md:min-h-[180px]"
            placeholder="공지 내용을 입력하세요..."
            autoFocus
          />
        </div>
        <DialogFooter className="px-6 py-3 border-t flex-row items-center gap-2">
          <UnifiedButton
            onClick={handleSave}
            disabled={!content.trim()}
            loading={saving}
            loadingText="저장 중..."
            size="sm"
            className="ml-auto"
          >
            저장
          </UnifiedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
