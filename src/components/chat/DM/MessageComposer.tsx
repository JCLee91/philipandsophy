'use client';

import { ChangeEvent, KeyboardEvent, useRef } from 'react';
import Image from 'next/image';
import { Paperclip, Send, X } from 'lucide-react';
import UnifiedButton from '@/components/UnifiedButton';
import { Input } from '@/components/ui/input';
import { FOOTER_STYLES } from '@/constants/ui';

type MessageComposerProps = {
  messageContent: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  imagePreview: string | null;
  onImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onResetImage: () => void;
  canSend: boolean;
  isUploading: boolean;
};

export default function MessageComposer({
  messageContent,
  onMessageChange,
  onSend,
  onKeyDown,
  imagePreview,
  onImageSelect,
  onResetImage,
  canSend,
  isUploading,
}: MessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageReset = () => {
    onResetImage();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onImageSelect(event);
  };

  return (
    <div className={FOOTER_STYLES.INPUT_CONTAINER}>
      {imagePreview && (
        <div className={`${FOOTER_STYLES.IMAGE_PREVIEW_MARGIN} relative inline-block w-32 h-32 animate-in fade-in-0 duration-fast`}>
          <Image
            src={imagePreview}
            alt="첨부 이미지"
            fill
            sizes="128px"
            className="object-cover rounded border"
          />
          <button
            onClick={handleImageReset}
            className="absolute -top-2 -right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-fast"
            type="button"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      )}

      <div className={`flex ${FOOTER_STYLES.BUTTON_GAP}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
        <UnifiedButton
          type="button"
          variant="outline"
          onClick={handleFileButtonClick}
          className="h-10 w-10 p-0 shrink-0"
          icon={<Paperclip className="h-4 w-4" />}
        />
        <Input
          value={messageContent}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="메시지를 입력하세요..."
          className="flex-1"
          disabled={isUploading}
        />
        <UnifiedButton
          onClick={onSend}
          disabled={!canSend}
          loading={isUploading}
          className="h-10 w-10 p-0 shrink-0"
          icon={<Send className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
