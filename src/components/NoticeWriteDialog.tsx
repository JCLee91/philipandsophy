'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import UnifiedButton from '@/components/UnifiedButton';
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
      <DialogContent className="gap-3 p-4 sm:gap-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>공지 작성</DialogTitle>
          <DialogDescription>
            참가자들에게 전달할 공지사항을 작성하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
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

        <DialogFooter className="gap-2 border-t pt-3 sm:gap-3 sm:pt-4">
          <div className="flex items-center gap-2 flex-1">
            <label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors duration-normal">
                <Paperclip className="h-4 w-4" />
                <span>이미지 첨부</span>
              </div>
            </label>
          </div>
          <UnifiedButton variant="outline" onClick={handleClose} size="sm">
            취소
          </UnifiedButton>
          <UnifiedButton
            onClick={handleSubmit}
            disabled={!content.trim()}
            loading={uploading}
            loadingText="업로드 중..."
            size="sm"
          >
            작성
          </UnifiedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
