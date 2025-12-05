'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Calendar } from 'lucide-react';
import { useDatacntrAuth, useFetchWithAuth } from '@/hooks/datacntr';
import { DatacntrPageShell } from '@/components/datacntr/layout';
import type { Notice, Cohort } from '@/types/database';
import NoticeTemplateSelector from '@/components/datacntr/NoticeTemplateSelector';
import SaveAsTemplateModal from '@/components/datacntr/SaveAsTemplateModal';
import CohortHeader from '@/components/datacntr/CohortHeader';
import NoticeCard from '@/components/datacntr/NoticeCard';
import { fetchWithTokenRefresh } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

interface NoticeWithCohort extends Notice {
  cohortName: string;
}

export default function NoticesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, selectedCohortId } = useDatacntrAuth();
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string>('');

  // 기수 목록 로드
  const { data: cohorts } = useFetchWithAuth<Cohort[]>({
    url: '/api/datacntr/cohorts',
    enabled: true,
    initialData: [],
  });

  // 공지사항 데이터 로드
  const { data: notices, isLoading, refetch } = useFetchWithAuth<NoticeWithCohort[]>({
    url: '/api/datacntr/notices',
    enabled: true,
    initialData: [],
  });

  // 선택된 코호트의 공지사항만 필터링 + 정렬
  const sortedNotices = useMemo(() => {
    if (!selectedCohortId || !notices) return [];
    return notices
      .filter((n) => n.cohortId === selectedCohortId)
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
  }, [notices, selectedCohortId]);

  const selectedCohort = cohorts?.find((c) => c.id === selectedCohortId);

  const handleSelectTemplate = (templateId: string) => {
    setShowTemplateSelector(false);
    router.push(`/datacntr/notices/create?templateId=${templateId}`);
  };

  const handleSaveAsTemplate = (noticeId: string) => {
    setSelectedNoticeId(noticeId);
    setShowSaveAsTemplateModal(true);
  };

  const handleDeleteNotice = useCallback(async (noticeId: string, author: string) => {
    if (!user) return;

    const confirmed = confirm(
      `정말 "${author}"의 공지를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    try {
      const response = await fetchWithTokenRefresh(`/api/datacntr/notices/${noticeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '공지 삭제 실패');
      }

      alert('공지가 삭제되었습니다.');
      refetch();
    } catch (error) {
      alert(error instanceof Error ? error.message : '공지 삭제 중 오류가 발생했습니다');
    }
  }, [user, refetch]);

  if (!user && !authLoading) return null;

  return (
    <DatacntrPageShell
      title="공지사항"
      description={selectedCohort?.name ? `${selectedCohort.name} 공지사항` : undefined}
      isLoading={authLoading || isLoading}
      requiresCohort
      hasCohortSelected={!!selectedCohortId}
    >
      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 공지</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{sortedNotices.length}개</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">이미지 첨부</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {sortedNotices.filter((n) => n.imageUrl).length}개
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 기수 헤더 */}
      <CohortHeader
        cohortName={selectedCohort?.name || selectedCohortId || ''}
        cohortId={selectedCohortId || ''}
        onCreateNotice={() => router.push('/datacntr/notices/create')}
        onUseTemplate={() => setShowTemplateSelector(true)}
        onManageTemplates={() => router.push('/datacntr/notice-templates')}
      />

      {/* 공지 목록 */}
      {sortedNotices.length > 0 ? (
        <div className="space-y-2">
          {sortedNotices.map((notice) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              onEdit={() => router.push(`/datacntr/notices/edit/${notice.id}`)}
              onSaveAsTemplate={() => handleSaveAsTemplate(notice.id)}
              onDelete={() => handleDeleteNotice(notice.id, notice.author)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center mt-4">
          <p className="text-gray-500 text-sm">이 기수에는 아직 공지가 없습니다</p>
        </div>
      )}

      {/* 템플릿 선택 모달 */}
      {showTemplateSelector && selectedCohortId && (
        <NoticeTemplateSelector
          cohortId={selectedCohortId}
          onClose={() => setShowTemplateSelector(false)}
          onSelectTemplate={handleSelectTemplate}
        />
      )}

      {/* 템플릿 저장 모달 */}
      {showSaveAsTemplateModal && (
        <SaveAsTemplateModal
          noticeId={selectedNoticeId}
          onClose={() => setShowSaveAsTemplateModal(false)}
          onSuccess={() => {
            setShowSaveAsTemplateModal(false);
            setSelectedNoticeId('');
          }}
        />
      )}
    </DatacntrPageShell>
  );
}
