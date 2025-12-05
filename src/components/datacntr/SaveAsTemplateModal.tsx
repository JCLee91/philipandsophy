'use client';

import { useState } from 'react';
import { DialogBase } from '@/components/common/dialogs';
import { UnifiedButton } from '@/components/common/buttons';
import { CATEGORY_LABELS } from '@/lib/firebase/notice-templates';
import type { NoticeTemplateCategory } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import FormSelect from '@/components/datacntr/form/FormSelect';

interface SaveAsTemplateModalProps {
  noticeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SaveAsTemplateModal({
  noticeId,
  onClose,
  onSuccess,
}: SaveAsTemplateModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoticeTemplateCategory>('event');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('템플릿 제목을 입력하세요');
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
      const templateId = `custom-${Date.now()}`;

      const response = await fetch(`/api/datacntr/notices/${noticeId}/to-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          templateId,
          category,
          title: title.trim(),
          order: 99,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '템플릿 저장 실패');
      }

      alert(`템플릿 "${title}"이(가) 저장되었습니다!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '템플릿 저장 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogBase
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title="템플릿으로 저장"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <UnifiedButton variant="secondary" onClick={onClose}>
            취소
          </UnifiedButton>
          <UnifiedButton
            onClick={handleSubmit}
            loading={isSubmitting}
            loadingText="저장 중..."
          >
            템플릿 저장
          </UnifiedButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
