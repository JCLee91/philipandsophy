'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload, X, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import type { Cohort } from '@/types/database';

export const dynamic = 'force-dynamic';

export default function NoticeCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [templateImageUrl, setTemplateImageUrl] = useState<string>(''); // ✅ 템플릿에서 가져온 이미지 URL
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // URL에서 cohortId 가져오기
  useEffect(() => {
    const cohortIdFromUrl = searchParams.get('cohortId');
    if (cohortIdFromUrl) {
      setSelectedCohortId(cohortIdFromUrl);
    }
  }, [searchParams]);

  // ✅ templateId가 있으면 템플릿 데이터 로드
  useEffect(() => {
    const templateId = searchParams.get('templateId');
    if (!templateId || !user) return;

    const fetchTemplate = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/datacntr/notice-templates/${templateId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('템플릿 조회 실패');
        }

        const template = await response.json();
        setContent(template.content);
        if (template.imageUrl) {
          setImagePreview(template.imageUrl);
          setTemplateImageUrl(template.imageUrl); // ✅ 템플릿 이미지 URL 저장
        }
      } catch (error) {
        logger.error('템플릿 로드 실패:', error);
        alert('템플릿을 불러오는데 실패했습니다.');
      }
    };

    fetchTemplate();
  }, [searchParams, user]);

  // 코호트 목록 조회
  useEffect(() => {
    if (!user) return;

    const fetchCohorts = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/cohorts', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('코호트 조회 실패');
        }

        const data = await response.json();
        setCohorts(data);
      } catch (error) {

        alert('코호트 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCohorts();
  }, [user]);

  // 이미지 파일 선택 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setImageFile(file);
    setTemplateImageUrl(''); // ✅ 새 이미지 선택 시 템플릿 이미지 URL 초기화

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 이미지 제거
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setTemplateImageUrl(''); // ✅ 템플릿 이미지 URL도 제거
  };

  // 공지 작성/임시저장 제출
  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();

    if (!selectedCohortId) {
      alert('기수를 선택해주세요.');
      return;
    }

    if (!content.trim()) {
      alert('공지 내용을 입력해주세요.');
      return;
    }

    if (!user) return;

    setIsSubmitting(true);

    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append('cohortId', selectedCohortId);
      formData.append('content', content.trim());
      formData.append('status', isDraft ? 'draft' : 'published');

      // ✅ 새 이미지 파일이 있으면 업로드
      if (imageFile) {
        formData.append('image', imageFile);
      }
      // ✅ 템플릿 이미지 URL이 있으면 전달 (새 이미지가 없을 때만)
      else if (templateImageUrl) {
        formData.append('templateImageUrl', templateImageUrl);
      }

      const response = await fetch('/api/datacntr/notices/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '공지 작성 실패');
      }

      alert(isDraft ? '공지가 임시저장되었습니다.' : '공지가 작성되었습니다.');
      router.push('/datacntr/notices');
    } catch (error) {

      alert(error instanceof Error ? error.message : '공지 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          뒤로 가기
        </button>
        <h1 className="text-3xl font-bold text-gray-900">공지사항 작성</h1>
        <p className="text-gray-600 mt-2">참여자들에게 공지사항을 전달합니다.</p>
      </div>

      {/* 공지 작성 폼 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기수 선택 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            기수 선택 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">기수를 선택하세요</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </select>
        </div>

        {/* 공지 내용 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            공지 내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="공지 내용을 입력하세요..."
            rows={10}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          />
          <p className="text-sm text-gray-500 mt-2">
            현재 {content.length}자
          </p>
        </div>

        {/* 이미지 업로드 */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            이미지 첨부 (선택)
          </label>

          {!imagePreview ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
              <div className="flex flex-col items-center justify-center py-6">
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">
                  클릭하여 이미지 업로드
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, WEBP (최대 5MB)
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative">
              <Image
                src={imagePreview}
                alt="미리보기"
                width={600}
                height={400}
                className="rounded-lg border border-gray-200 w-full h-auto"
                unoptimized
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* 제출 버튼 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={isSubmitting}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                '임시저장'
              )}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  작성 중...
                </>
              ) : (
                '공지 작성'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
