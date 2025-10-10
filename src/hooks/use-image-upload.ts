'use client';

import { useState, ChangeEvent } from 'react';

/**
 * 이미지 업로드 및 미리보기를 위한 커스텀 훅
 */
export function useImageUpload() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
