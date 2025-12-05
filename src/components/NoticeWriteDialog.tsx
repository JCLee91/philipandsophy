'use client';

import { Textarea } from '@/components/ui/textarea';
import { FullScreenDialog } from '@/components/common/dialogs';
import { UnifiedButton } from '@/components/common/buttons';
import { Paperclip, X } from 'lucide-react';
import Image from 'next/image';
import { useImageUpload } from '@/hooks/use-image-upload';

interface NoticeWriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onContentChange: (content: string) => void;
  onSubmit: (imageFile: File | null) => Promise<void>;
  uploading: boolean;
  isMeetup?: boolean;
}

export default function NoticeWriteDialog({
  open,
  onOpenChange,
  content,
  onContentChange,
  onSubmit,
  uploading,
  isMeetup = false,
}: NoticeWriteDialogProps) {
  const { imageFile, imagePreview, handleImageSelect, resetImage } = useImageUpload();

  const handleSubmit = async () => {
    await onSubmit(imageFile);
    resetImage();
  };

  return (
    <FullScreenDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isMeetup ? '메시지 작성' : '공지 작성'}
      description={
        isMeetup ? '멤버들과 이야기를 나눠보세요.' : '참가자들에게 전달할 공지사항을 작성하세요.'
      }
      footer={
        <div className="flex items-center gap-3 px-5 py-3">
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-2 h-10 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors duration-normal cursor-pointer">
              <Paperclip className="h-4 w-4" />
              <span>이미지 첨부</span>
            </div>
          </label>
          <UnifiedButton
            onClick={handleSubmit}
            disabled={!content.trim()}
            loading={uploading}
            loadingText="작성 중..."
            size="sm"
            className="flex-1"
          >
            작성 완료
          </UnifiedButton>
        </div>
      }
      contentClassName="px-5 py-4 space-y-3"
    >
      {/* 이미지 미리보기 */}
      {imagePreview && (
        <div className="flex justify-center">
          <div className="relative w-full max-w-sm h-48 animate-in fade-in-0 duration-fast">
            <Image
              src={imagePreview}
              alt="첨부 이미지"
              fill
              className="object-contain rounded border"
            />
            <button
              onClick={resetImage}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-fast"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}

      <Textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        className="min-h-[200px] border-0 focus-visible:ring-0 resize-none p-0 text-base"
        placeholder={isMeetup ? '메시지를 입력하세요...' : '공지 내용을 입력하세요...'}
        autoFocus
      />
    </FullScreenDialog>
  );
}
