'use client';

import { useCallback, useState } from 'react';
import { APP_CONSTANTS } from '@/constants/app';
import { uploadNoticeImage } from '@/lib/firebase/storage';
import { useCreateNotice, useUpdateNotice, useDeleteNotice } from '@/hooks/use-notices';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

type CreateNoticeParams = {
  cohortId?: string;
  content: string;
  imageFile: File | null;
  author?: string;
};

type UpdateNoticeParams = {
  noticeId: string;
  content: string;
};

const IMAGE_UPLOAD_ERROR = {
  DEFAULT: '이미지 업로드에 실패했습니다.',
  QUOTA: '스토리지 용량이 초과되었습니다. 관리자에게 문의하세요.',
  UNAUTHORIZED: '이미지 업로드 권한이 없습니다.',
} as const;

function mapStorageError(error: unknown): string {
  if (!(error instanceof Error)) return IMAGE_UPLOAD_ERROR.DEFAULT;
  if (error.message.includes('storage/quota-exceeded')) {
    return IMAGE_UPLOAD_ERROR.QUOTA;
  }
  if (error.message.includes('storage/unauthorized')) {
    return IMAGE_UPLOAD_ERROR.UNAUTHORIZED;
  }
  return IMAGE_UPLOAD_ERROR.DEFAULT;
}

export function useNoticeActions() {
  const { toast } = useToast();
  const createNoticeMutation = useCreateNotice();
  const updateNoticeMutation = useUpdateNotice();
  const deleteNoticeMutation = useDeleteNotice();
  const [isUploading, setIsUploading] = useState(false);

  const createNotice = useCallback(
    async ({ cohortId, content, imageFile, author = APP_CONSTANTS.ADMIN_NAME }: CreateNoticeParams) => {
      if (!cohortId) {
        toast({
          title: '기수 정보가 없습니다.',
          description: '다시 로그인 후 시도해주세요.',
          variant: 'destructive',
        });
        return false;
      }

      if (!content.trim()) {
        return false;
      }

      setIsUploading(true);
      try {
        let imageUrl: string | undefined;
        if (imageFile) {
          try {
            imageUrl = await uploadNoticeImage(imageFile, cohortId);
          } catch (uploadError) {
            const message = mapStorageError(uploadError);
            toast({
              title: '이미지 업로드 실패',
              description: message,
              variant: 'destructive',
            });
            throw uploadError;
          }
        }

        await createNoticeMutation.mutateAsync({
          cohortId,
          author,
          content: content.trim(),
          isCustom: true,
          imageUrl,
        });
        return true;
      } catch (error) {

        if (!(error instanceof Error && error.message.includes('storage/'))) {
          toast({
            title: '공지 작성 실패',
            description: '공지 작성에 실패했습니다. 다시 시도해주세요.',
            variant: 'destructive',
          });
        }
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [createNoticeMutation, toast]
  );

  const updateNotice = useCallback(
    async ({ noticeId, content }: UpdateNoticeParams) => {
      if (!content.trim()) {
        return false;
      }

      try {
        await updateNoticeMutation.mutateAsync({
          id: noticeId,
          data: { content: content.trim() },
        });
        return true;
      } catch (error) {

        toast({
          title: '공지 수정 실패',
          description: '공지 내용을 수정하지 못했습니다. 다시 시도해주세요.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast, updateNoticeMutation]
  );

  const deleteNotice = useCallback(
    async (noticeId: string) => {
      try {
        await deleteNoticeMutation.mutateAsync(noticeId);
        return true;
      } catch (error) {

        toast({
          title: '공지 삭제 실패',
          description: '공지 삭제에 실패했습니다. 다시 시도해주세요.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [deleteNoticeMutation, toast]
  );

  return {
    createNotice,
    updateNotice,
    deleteNotice,
    isUploading,
    isUpdating: updateNoticeMutation.isPending,
    isDeleting: deleteNoticeMutation.isPending,
  };
}

export type NoticeActions = ReturnType<typeof useNoticeActions>;
