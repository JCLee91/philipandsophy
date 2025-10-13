'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import UnifiedButton from '@/components/UnifiedButton';
import { Paperclip, X } from 'lucide-react';
import Image from 'next/image';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';

interface NoticeWriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onContentChange: (content: string) => void;
  onSubmit: (imageFile: File | null) => Promise<void>;
  uploading: boolean;
}

export default function NoticeWriteDialog({
  open,
  onOpenChange,
  content,
  onContentChange,
  onSubmit,
  uploading,
}: NoticeWriteDialogProps) {
  const { imageFile, imagePreview, handleImageSelect, resetImage } = useImageUpload();

  // Radix UI Dialog body 스타일 정리 (Race Condition 방지)
  useModalCleanup(open);

  const handleSubmit = async () => {
    await onSubmit(imageFile);
    resetImage();
  };

  const handleClose = () => {
    onOpenChange(false);
    resetImage();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 py-6 border-b">
          <DialogTitle>공지 작성</DialogTitle>
          <DialogDescription>
            참가자들에게 전달할 공지사항을 작성하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="min-h-[120px]"
            placeholder="공지 내용을 입력하세요..."
            autoFocus
          />

          {/* 이미지 미리보기 */}
          {imagePreview && (
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
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t flex-row items-center gap-2">
          <label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <div className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors duration-normal cursor-pointer">
              <Paperclip className="h-4 w-4" />
              <span>이미지 첨부</span>
            </div>
          </label>
          <UnifiedButton
            onClick={handleSubmit}
            disabled={!content.trim()}
            loading={uploading}
            loadingText="업로드 중..."
            size="sm"
            className="ml-auto"
          >
            작성
          </UnifiedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
