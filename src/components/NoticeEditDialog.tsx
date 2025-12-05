'use client';

import { DialogBase } from '@/components/common/dialogs';
import { UnifiedButton } from '@/components/common/buttons';
import { Textarea } from '@/components/ui/textarea';

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
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="공지 수정"
      description="공지 내용을 수정하세요."
      size="md"
      footer={
        <div className="flex justify-end">
          <UnifiedButton
            onClick={onSave}
            disabled={!content.trim()}
            loading={saving}
            loadingText="저장 중..."
            size="sm"
          >
            저장
          </UnifiedButton>
        </div>
      }
    >
      <div className="p-5">
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className="min-h-[120px]"
          placeholder="공지 내용을 입력하세요..."
          autoFocus
        />
      </div>
    </DialogBase>
  );
}
