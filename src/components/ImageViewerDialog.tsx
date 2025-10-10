'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import Image from 'next/image';

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
}

/**
 * 이미지를 크게 볼 수 있는 다이얼로그
 * DM에서 작은 이미지 클릭 시 전체 화면으로 표시
 */
export default function ImageViewerDialog({
  open,
  onOpenChange,
  imageUrl,
}: ImageViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/95 border-0">
        {/* 닫기 버튼 */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-fast"
        >
          <X className="h-6 w-6 text-white" />
        </button>

        {/* 이미지 컨테이너 */}
        <div className="relative w-full h-full min-h-[300px] max-h-[85vh] flex items-center justify-center p-4">
          <div className="relative w-full h-full">
            <Image
              src={imageUrl}
              alt="크게 보기"
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-contain"
              priority
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
