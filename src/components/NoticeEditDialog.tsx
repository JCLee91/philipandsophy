'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import UnifiedButton from '@/components/UnifiedButton';

interface NoticeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => Promise<void>;
}

export default function NoticeEditDialog({
  open,
  onOpenChange,
  content,
  onContentChange,
  onSave,
}: NoticeEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>공지 수정</DialogTitle>
          <DialogDescription>
            공지 내용을 수정하세요.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className="min-h-[120px]"
          placeholder="공지 내용을 입력하세요..."
        />
        <DialogFooter className="gap-3 border-t pt-4">
          <UnifiedButton variant="outline" onClick={() => onOpenChange(false)} size="sm">
            취소
          </UnifiedButton>
          <UnifiedButton onClick={onSave} disabled={!content.trim()} size="sm">
            저장
          </UnifiedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
