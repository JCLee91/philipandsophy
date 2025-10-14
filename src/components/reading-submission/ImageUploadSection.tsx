'use client';

import { Label } from '@/components/ui/label';
import UnifiedButton from '@/components/UnifiedButton';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadSectionProps {
  preview: string;
  isEditMode: boolean;
  disabled: boolean;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
}

/**
 * 책 사진 업로드 섹션
 *
 * 독서 인증 다이얼로그에서 분리한 재사용 가능한 컴포넌트
 */
export function ImageUploadSection({
  preview,
  isEditMode,
  disabled,
  onImageSelect,
  onImageRemove,
}: ImageUploadSectionProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">
        1. 책 사진 <span className="text-destructive">*</span>
      </Label>
      <p className="text-sm text-muted-foreground">
        {isEditMode ? '책 사진은 수정할 수 없습니다.' : '오늘 읽은 책의 사진을 첨부해주세요.'}
      </p>

      {!preview ? (
        <div className="flex flex-col gap-2">
          <UnifiedButton
            type="button"
            variant="outline"
            className="w-full h-32 border-dashed"
            onClick={() => document.getElementById('book-image-input')?.click()}
            disabled={disabled}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                책 사진 업로드하기
              </span>
            </div>
          </UnifiedButton>
          <input
            id="book-image-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImageSelect}
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
          <Image
            src={preview}
            alt="책 사진"
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            priority
            className="object-cover"
          />
          {!isEditMode && (
            <UnifiedButton
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={onImageRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </UnifiedButton>
          )}
        </div>
      )}
    </div>
  );
}
