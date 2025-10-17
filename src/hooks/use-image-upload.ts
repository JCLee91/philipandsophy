'use client';

import { useState, ChangeEvent } from 'react';
import { validateImageFile } from '@/lib/image-validation';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

/**
 * 이미지 업로드 및 미리보기를 위한 커스텀 훅
 *
 * 파일 검증 포함:
 * - 이미지 타입 체크
 * - 최대 크기 10MB 제한
 */
export function useImageUpload() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 검증 (최대 10MB)
    const validation = validateImageFile(file, 10);
    if (!validation.valid) {
      toast({
        title: '이미지 업로드 실패',
        description: validation.error,
        variant: 'destructive',
      });
      logger.warn('이미지 검증 실패:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        error: validation.error
      });
      return;
    }

    // 파일 설정 및 미리보기 생성
    setImageFile(file);
    const reader = new FileReader();

    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };

    reader.onerror = () => {
      toast({
        title: '이미지 로드 실패',
        description: '이미지를 불러올 수 없습니다. 다른 이미지를 시도해주세요.',
        variant: 'destructive',
      });
      logger.error('FileReader 에러:', { fileName: file.name });
      setImageFile(null);
      setImagePreview(null);
    };

    reader.readAsDataURL(file);
  };

  const resetImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return {
    imageFile,
    imagePreview,
    handleImageSelect,
    resetImage,
  };
}
