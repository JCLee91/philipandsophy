'use client';

import { useEffect, useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import type { NoticeTemplate } from '@/types/database';
import { CATEGORY_LABELS } from '@/lib/firebase/notice-templates';
import { useAuth } from '@/contexts/AuthContext';

interface NoticeTemplateSelectorProps {
  cohortId: string;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void; // ✅ 템플릿 선택 시 콜백
}

export default function NoticeTemplateSelector({
  cohortId,
  onClose,
  onSelectTemplate,
}: NoticeTemplateSelectorProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<NoticeTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>(''); // ✅ 단일 선택
  const [isLoading, setIsLoading] = useState(true);
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

  // ✅ 라디오 버튼 선택
  const handleSelectTemplate = (templateId: string) => {
    setSelectedId(templateId);
  };

  // ✅ 템플릿 선택 후 공지 작성 페이지로 이동
  const handleSubmit = () => {
    if (!selectedId) {
      alert('템플릿을 선택해주세요');
      return;
    }

    onSelectTemplate(selectedId);
    onClose();
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

        {/* 선택된 템플릿 표시 */}
        {selectedId && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-sm text-blue-900 font-medium">
              템플릿 1개 선택됨
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
                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedId === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center h-6">
                          <input
                            type="radio"
                            name="template"
                            checked={selectedId === template.id}
                            onChange={() => handleSelectTemplate(template.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">
                              {template.title}
                            </h4>
                            {selectedId === template.id && (
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
            disabled={!selectedId}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            템플릿 적용하기
          </button>
        </div>
      </div>
    </div>
  );
}
