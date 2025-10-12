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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 flex flex-col gap-0">
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
            className="min-h-[120px]"
            placeholder="공지 내용을 입력하세요..."
            autoFocus
          />
        </div>
        <DialogFooter className="px-6 py-3 border-t flex-row items-center gap-2">
          <UnifiedButton 
            onClick={onSave} 
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
