'use client';

import { useState, useEffect } from 'react';
import { Loader2, Upload, X, ZoomIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getLandingConfig, updateLandingConfig } from '@/lib/firebase/landing';
import { uploadLandingImage } from '@/lib/firebase/storage';
import { LandingConfig } from '@/types/landing';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { convertToLosslessWebP, addCacheBustParam } from '@/lib/image-utils';
import { IMAGE_SECTIONS, ImageSlot } from '@/constants/landing-images';

export default function LandingImagesForm() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [previewSlot, setPreviewSlot] = useState<ImageSlot | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const data = await getLandingConfig();
      setConfig(data);
    } catch (error) {
      toast({
        title: '설정 로드 실패',
        description: '설정을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (slotId: string, file: File) => {
    if (!config) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: '이미지 파일만 업로드 가능합니다.', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: '10MB 이하만 업로드 가능합니다.', variant: 'destructive' });
      return;
    }

    try {
      setUploading(slotId);

      // 1. WebP로 변환
      toast({ title: 'WebP로 변환 중...' });
      const webpFile = await convertToLosslessWebP(file);

      // 2. 업로드
      toast({ title: '업로드 중...' });
      const downloadUrl = await uploadLandingImage(webpFile);

      // 3. 캐시 버스트 적용된 URL 저장
      const urlWithCacheBust = addCacheBustParam(downloadUrl);
      const newImages = { ...config.images, [slotId]: urlWithCacheBust };

      await updateLandingConfig({ ...config, images: newImages });
      setConfig({ ...config, images: newImages });
      toast({ title: '업로드 완료 (WebP 변환됨)' });
    } catch (error) {
      logger.error('Failed to upload landing image:', error);
      toast({ title: '업로드 실패', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteImage = async (slotId: string) => {
    if (!config) return;
    if (!confirm('기본 이미지로 초기화하시겠습니까?')) return;

    try {
      setUploading(slotId);
      const newImages = { ...config.images };
      delete newImages[slotId];

      await updateLandingConfig({ ...config, images: newImages });
      setConfig({ ...config, images: newImages });
      setPreviewSlot(null);
      toast({ title: '초기화 완료' });
    } catch (error) {
      logger.error('Failed to delete landing image:', error);
      toast({ title: '초기화 실패', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  // 현재 표시할 이미지 URL (커스텀 or 기본)
  const getDisplayImage = (slot: ImageSlot) => {
    return config?.images?.[slot.id] || slot.defaultImage;
  };

  // 커스텀 이미지 여부
  const isCustomImage = (slot: ImageSlot) => {
    return !!config?.images?.[slot.id];
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {IMAGE_SECTIONS.map((section) => (
          <div key={section.id}>
            {/* 섹션 헤더 */}
            <h3 className="text-sm font-medium text-gray-900 mb-3">{section.title}</h3>

            {/* 이미지 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {section.slots.map((slot) => {
                const displayImage = getDisplayImage(slot);
                const isCustom = isCustomImage(slot);
                const isUploading = uploading === slot.id;

                return (
                  <div
                    key={slot.id}
                    className={cn(
                      "border rounded-lg overflow-hidden bg-white",
                      isUploading && "opacity-60"
                    )}
                  >
                    {/* 이미지 영역 - 클릭하면 확대 */}
                    <div
                      className="group relative aspect-square bg-gray-50 cursor-pointer"
                      onClick={() => setPreviewSlot(slot)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayImage}
                        alt={slot.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white" />
                      </div>

                      {/* 커스텀 표시 배지 */}
                      {isCustom && (
                        <div className="absolute top-1 right-1 px-1 py-0.5 bg-blue-500 text-white text-[9px] font-medium rounded">
                          커스텀
                        </div>
                      )}

                      {isUploading && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* 하단 정보 + 버튼 */}
                    <div className="flex items-center justify-between px-2 py-1.5 border-t bg-white gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-900 truncate">{slot.label}</p>
                        <p className="text-[10px] text-gray-400">{slot.resolution}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* 업로드 버튼 */}
                        <label>
                          <div className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 cursor-pointer text-gray-500 hover:text-gray-700">
                            <Upload className="h-3.5 w-3.5" />
                          </div>
                          <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(slot.id, file);
                              e.target.value = '';
                            }}
                            disabled={!!uploading}
                          />
                        </label>
                        {/* 초기화 버튼 (커스텀일 때만) */}
                        {isCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            onClick={() => handleDeleteImage(slot.id)}
                            disabled={!!uploading}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* 가이드 */}
        <p className="text-xs text-gray-400">
          권장 포맷: WebP, PNG, JPG (최대 10MB) · 커스텀 이미지 업로드 시 기본 이미지 대체
        </p>
      </div>

      {/* 이미지 확대 모달 */}
      <Dialog open={!!previewSlot} onOpenChange={() => setPreviewSlot(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{previewSlot?.label}</span>
                {previewSlot && isCustomImage(previewSlot) && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">
                    커스텀
                  </span>
                )}
              </div>
              <span className="text-sm font-normal text-gray-400">{previewSlot?.resolution}</span>
            </DialogTitle>
          </DialogHeader>

          {previewSlot && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getDisplayImage(previewSlot)}
                alt={previewSlot.label}
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

