'use client';

import { Textarea } from '@/components/ui/textarea';
import UnifiedButton from '@/components/UnifiedButton';
import { Paperclip, X } from 'lucide-react';
import Image from 'next/image';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { FOOTER_STYLES } from '@/constants/ui';
import { Z_INDEX } from '@/constants/z-index';

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
  const keyboardHeight = useKeyboardHeight();

  // Radix UI Dialog body 스타일 정리 (Race Condition 방지)
  useModalCleanup(open);

  const handleSubmit = async () => {
    await onSubmit(imageFile);
    resetImage();
  };

  const isKeyboardOpen = keyboardHeight > 0;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: Z_INDEX.DM_DIALOG }}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={`fixed z-[9999] bg-background transition-all duration-300 
          inset-0 w-full h-full 
          sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 
          sm:w-full sm:max-w-lg sm:h-[600px] sm:rounded-xl sm:border sm:shadow-lg`}
        onClick={(e) => e.stopPropagation()}
        style={
          !isKeyboardOpen && typeof window !== 'undefined' && window.innerWidth >= 640
            ? {} // Desktop: Use Tailwind classes
            : isKeyboardOpen
              ? {
                // Mobile Keyboard Open
                height: `calc(100vh - ${keyboardHeight}px)`,
                top: 0,
              }
              : {
                // Mobile Default: Full screen
                height: '100%',
                top: 0,
              }
        }
      >
        <div className="flex flex-col h-full w-full bg-background sm:rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="text-lg font-bold">{isMeetup ? '메시지 작성' : '공지 작성'}</h2>
              <p className="text-xs text-gray-500">
                {isMeetup ? '멤버들과 이야기를 나눠보세요.' : '참가자들에게 전달할 공지사항을 작성하세요.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex items-center justify-center h-11 w-11 -mr-2 rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:bg-gray-200"
              aria-label="닫기"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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
              placeholder={isMeetup ? "메시지를 입력하세요..." : "공지 내용을 입력하세요..."}
              autoFocus
            />
          </div>

          {/* Footer */}
          <div
            className={`${FOOTER_STYLES.DIALOG_FOOTER} border-t bg-white ${!isKeyboardOpen ? 'pb-[calc(1rem+env(safe-area-inset-bottom))]' : ''
              }`}
          >
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
          </div>
        </div>
      </div>
    </>
  );
}
