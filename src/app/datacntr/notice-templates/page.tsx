'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Plus, BookTemplate, Edit, Trash2, ArrowLeft } from 'lucide-react';
import type { NoticeTemplate } from '@/types/database';
import { CATEGORY_LABELS } from '@/lib/firebase/notice-templates';
import EditTemplateModal from '@/components/datacntr/EditTemplateModal';
import { logger } from '@/lib/logger';


// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';
export default function NoticeTemplatesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<NoticeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NoticeTemplate | null>(null);

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
  }, [authLoading, user, router]);

  // 템플릿 데이터 로드
  useEffect(() => {
    if (!user) return;

    const fetchTemplates = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/notice-templates', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('템플릿 조회 실패');
        }

        const data = await response.json();
        setTemplates(data.templates);
      } catch (error) {
        logger.error('템플릿 조회 실패 (notice-templates-page)', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [user]);

  // 템플릿 목록 새로고침
  const refreshTemplates = async () => {
    if (!user) return;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/datacntr/notice-templates', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      logger.error('템플릿 새로고침 실패 (notice-templates-page)', error);
    }
  };

  // 템플릿 편집
  const handleEditTemplate = (template: NoticeTemplate) => {
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  // 템플릿 삭제
  const handleDeleteTemplate = async (templateId: string, title: string) => {
    if (!user) return;

    const confirmed = confirm(`정말 "${title}" 템플릿을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/datacntr/notice-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '템플릿 삭제 실패');
      }

      alert(`템플릿 "${title}"이(가) 삭제되었습니다.`);
      await refreshTemplates();
    } catch (error) {
      logger.error('템플릿 삭제 실패 (notice-templates-page)', error);
      alert(error instanceof Error ? error.message : '템플릿 삭제 중 오류가 발생했습니다');
    }
  };

  // 편집 성공 후 처리
  const handleEditSuccess = async () => {
    setShowEditModal(false);
    setSelectedTemplate(null);
    await refreshTemplates();
  };

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

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/datacntr/notices')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">공지 템플릿 관리</h1>
            <p className="text-gray-600 mt-2">재활용 가능한 공지 템플릿</p>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          새 템플릿 추가
        </button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 템플릿</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {templates.length}개
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <BookTemplate className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
          const count = groupedTemplates[category]?.length || 0;
          return (
            <div
              key={category}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <p className="text-sm text-gray-600">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{count}개</p>
            </div>
          );
        })}
      </div>

      {/* 템플릿 리스트 (카테고리별) */}
      <div className="space-y-8">
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
          <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {CATEGORY_LABELS[category] || category}
              </h2>
            </div>

            <div className="divide-y divide-gray-200">
              {categoryTemplates.map((template) => (
                <div
                  key={template.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {template.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {template.content.substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>ID: {template.id}</span>
                        <span>순서: {template.order}</span>
                        {template.imageUrl && <span>🖼️ 이미지 포함</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        type="button"
                        onClick={() => handleEditTemplate(template)}
                        className="p-2 text-gray-600 rounded-lg hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="수정"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(template.id, template.title)}
                        className="p-2 text-gray-600 rounded-lg hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <BookTemplate className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">등록된 템플릿이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">
            새 템플릿을 추가하거나 시드 스크립트를 실행하세요
          </p>
        </div>
      )}

      {/* 편집 모달 */}
      {showEditModal && selectedTemplate && (
        <EditTemplateModal
          template={selectedTemplate}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
