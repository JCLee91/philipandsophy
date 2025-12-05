'use client';

import { useState } from 'react';
import { DialogBase } from '@/components/common/dialogs';
import { UnifiedButton } from '@/components/common/buttons';
import { CATEGORY_LABELS } from '@/lib/firebase/notice-templates';
import type { NoticeTemplate, NoticeTemplateCategory } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import FormSelect from '@/components/datacntr/form/FormSelect';

interface EditTemplateModalProps {
  template: NoticeTemplate;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTemplateModal({
  template,
  onClose,
  onSuccess,
}: EditTemplateModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(template.title);
  const [content, setContent] = useState(template.content);
  const [category, setCategory] = useState<NoticeTemplateCategory>(template.category);
  const [imageUrl, setImageUrl] = useState(template.imageUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!title.trim()) {
      setError('템플릿 제목을 입력하세요');
      return;
    }

    if (!content.trim()) {
      setError('템플릿 내용을 입력하세요');
      return;
    }

    if (!user) {
      setError('로그인이 필요합니다');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const idToken = await user.getIdToken();

      const response = await fetch(`/api/datacntr/notice-templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          imageUrl: imageUrl.trim() || undefined,
          order: template.order,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '템플릿 수정 실패');
      }

      alert(`템플릿 "${title}"이(가) 수정되었습니다!`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '템플릿 수정 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogBase
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title="템플릿 수정"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <UnifiedButton variant="secondary" onClick={onClose}>
            취소
          </UnifiedButton>
          <UnifiedButton
            onClick={() => handleSubmit()}
            loading={isSubmitting}
            loadingText="수정 중..."
          >
            수정 완료
          </UnifiedButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* 템플릿 ID (읽기 전용) */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">템플릿 ID</label>
          <input
            type="text"
            value={template.id}
            disabled
            className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
          />
        </div>

        {/* 템플릿 제목 */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-2">
            템플릿 제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 특별 이벤트 안내"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* 카테고리 */}
        <FormSelect
          label="카테고리"
          value={category}
          onChange={(value) => setCategory(value as NoticeTemplateCategory)}
          options={[
            { value: 'onboarding', label: CATEGORY_LABELS.onboarding },
            { value: 'guide', label: CATEGORY_LABELS.guide },
            { value: 'milestone', label: CATEGORY_LABELS.milestone },
            { value: 'event', label: CATEGORY_LABELS.event },
          ]}
          required
        />

        {/* 내용 */}
        <div>
          <label htmlFor="content" className="block text-sm font-semibold text-gray-900 mb-2">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="템플릿 내용을 입력하세요"
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* 이미지 URL */}
        <div>
          <label htmlFor="imageUrl" className="block text-sm font-semibold text-gray-900 mb-2">
            이미지 URL (선택)
          </label>
          <input
            type="url"
            id="imageUrl"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </form>
    </DialogBase>
  );
}
