'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface UseSimpleImageUploadOptions {
  maxSizeMB?: number;
  onUpload?: (file: File, preview: string) => void;
}

/**
 * 간소화된 이미지 업로드 훅
 *
 * 복잡한 압축 로직 제거, 단순 검증만 수행
 * Firebase Storage가 자동으로 최적화하므로 클라이언트 압축 불필요
 */
export function useSimpleImageUpload(options: UseSimpleImageUploadOptions = {}) {
  const { maxSizeMB = 50, onUpload } = options;
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 이미지 선택 핸들러
  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setIsProcessing(true);

      try {
        // 1. 파일 크기 검증
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (selectedFile.size > maxSizeBytes) {
          toast({
            title: '파일이 너무 큽니다',
            description: `${maxSizeMB}MB 이하 파일만 업로드 가능합니다.`,
            variant: 'destructive',
          });
          return;
        }

        // 2. 파일 타입 검증
        if (!selectedFile.type.startsWith('image/')) {
          toast({
            title: '이미지 파일만 가능합니다',
            description: 'JPG, PNG, WebP 등의 이미지 파일을 선택해주세요.',
            variant: 'destructive',
          });
          return;
        }

        // 3. 미리보기 생성
        const previewUrl = await createImagePreview(selectedFile);

        // 4. 상태 업데이트
        setFile(selectedFile);
        setPreview(previewUrl);

        // 5. 콜백 호출
        if (onUpload) {
          onUpload(selectedFile, previewUrl);
        }

        logger.debug('이미지 선택 완료', {
          name: selectedFile.name,
          size: `${(selectedFile.size / 1024 / 1024).toFixed(1)}MB`,
          type: selectedFile.type,
        });
      } catch (error) {
        logger.error('이미지 처리 실패', error);
        toast({
          title: '이미지 처리 실패',
          description: error instanceof Error ? error.message : '이미지를 처리할 수 없습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [maxSizeMB, onUpload, toast]
  );

  // 이미지 제거 핸들러
  const removeImage = useCallback(() => {
    setFile(null);
    setPreview('');
  }, []);

  // 이미지 초기화 (외부에서 preview 설정)
  const setImagePreview = useCallback((previewUrl: string) => {
    setPreview(previewUrl);
  }, []);

  return {
    file,
    preview,
    isProcessing,
    handleImageSelect,
    removeImage,
    setImagePreview,
  };
}

/**
 * FileReader로 이미지 미리보기 생성
 */
function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reader.abort();
      reject(new Error('이미지를 불러올 수 없습니다.'));
    };

    reader.readAsDataURL(file);
  });
}
