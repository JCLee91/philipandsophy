'use client';

import { useEffect, useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import type { NoticeTemplate } from '@/types/database';
import { CATEGORY_LABELS } from '@/lib/firebase/notice-templates';
import { useAuth } from '@/contexts/AuthContext';

interface NoticeTemplateSelectorProps {
  cohortId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NoticeTemplateSelector({
  cohortId,
  onClose,
  onSuccess,
}: NoticeTemplateSelectorProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<NoticeTemplate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 템플릿 로드
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        if (!user) throw new Error('로그인이 필요합니다');

        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/notice-templates', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) throw new Error('템플릿 조회 실패');

        const data = await response.json();
        setTemplates(data.templates);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [user]);

  // 카테고리별 그룹핑
  const groupedTemplates = templates.reduce(
    (acc, template) => {
      const category = template.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, NoticeTemplate[]>
  );

  // 체크박스 토글
  const toggleTemplate = (templateId: string) => {
    setSelectedIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  // 템플릿에서 공지 생성
  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      alert('템플릿을 선택해주세요');
      return;
    }

    if (!user) {
      alert('로그인이 필요합니다');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/datacntr/notices/from-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          cohortId,
          templateIds: selectedIds,
          author: '운영자',
        }),
      });

      if (!response.ok) throw new Error('공지 생성 실패');

      const result = await response.json();
      alert(`${result.createdCount}개의 공지가 생성되었습니다`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">템플릿에서 선택</h2>
            <p className="text-sm text-gray-600 mt-1">
              선택한 템플릿을 공지로 추가합니다
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* 선택된 개수 */}
        {selectedIds.length > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-sm text-blue-900 font-medium">
              {selectedIds.length}개 선택됨
            </p>
          </div>
        )}

        {/* 템플릿 리스트 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {CATEGORY_LABELS[category] || category} ({categoryTemplates.length})
                  </h3>
                  <div className="space-y-2">
                    {categoryTemplates.map((template) => (
                      <label
                        key={template.id}
                        className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center h-6">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(template.id)}
                            onChange={() => toggleTemplate(template.id)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">
                              {template.title}
                            </h4>
                            {selectedIds.includes(template.id) && (
                              <Check className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {template.content.substring(0, 100)}...
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedIds.length === 0 || isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                생성 중...
              </>
            ) : (
              `선택한 템플릿 ${selectedIds.length}개 적용하기`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
