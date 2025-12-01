'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Bell, Calendar, Users } from 'lucide-react';
import { useDatacntrStore } from '@/stores/datacntr-store';
import type { Notice, Cohort } from '@/types/database';
import NoticeTemplateSelector from '@/components/datacntr/NoticeTemplateSelector';
import SaveAsTemplateModal from '@/components/datacntr/SaveAsTemplateModal';
import CohortHeader from '@/components/datacntr/CohortHeader';
import NoticeCard from '@/components/datacntr/NoticeCard';

export const dynamic = 'force-dynamic';

interface NoticeWithCohort extends Notice {
  cohortName: string;
}

export default function NoticesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { selectedCohortId } = useDatacntrStore();
  const [notices, setNotices] = useState<NoticeWithCohort[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string>('');

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
  }, [authLoading, user, router]);

  // 기수 목록 로드
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

        if (response.ok) {
          const data = await response.json();
          setCohorts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        // 에러 처리
      }
    };

    fetchCohorts();
  }, [user]);

  // 공지사항 데이터 로드
  useEffect(() => {
    if (!user) return;

    const fetchNotices = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/notices', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('공지사항 조회 실패');
        }

        const data = await response.json();
        setNotices(data);
      } catch (error) {
        // 에러 처리
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotices();
  }, [user]);

  // 선택된 코호트의 공지사항만 필터링
  const filteredNotices = selectedCohortId
    ? notices.filter((n) => n.cohortId === selectedCohortId)
    : [];

  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId);

  // 템플릿 추가 핸들러
  const handleAddTemplate = () => {
    setShowTemplateSelector(true);
  };

  // 템플릿 선택 후 공지 작성 페이지로 이동
  const handleSelectTemplate = (templateId: string) => {
    setShowTemplateSelector(false);
    router.push(`/datacntr/notices/create?templateId=${templateId}`);
  };

  // 공지를 템플릿으로 저장 (모달 열기)
  const handleSaveAsTemplate = (noticeId: string) => {
    setSelectedNoticeId(noticeId);
    setShowSaveAsTemplateModal(true);
  };

  // 템플릿 저장 성공 후 처리
  const handleSaveAsTemplateSuccess = () => {
    setShowSaveAsTemplateModal(false);
    setSelectedNoticeId('');
  };

  // 공지 삭제
  const handleDeleteNotice = async (noticeId: string, author: string) => {
    if (!user) return;

    const confirmed = confirm(
      `정말 "${author}"의 공지를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/datacntr/notices/${noticeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '공지 삭제 실패');
      }

      alert('공지가 삭제되었습니다.');

      // 공지 목록 새로고침
      const refreshResponse = await fetch('/api/datacntr/notices', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setNotices(data);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '공지 삭제 중 오류가 발생했습니다');
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

  // 기수가 선택되지 않은 경우
  if (!selectedCohortId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">공지사항</h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <Users className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">기수를 먼저 선택해주세요</h2>
          <p className="text-gray-600">
            공지사항을 확인하려면 상단 헤더에서 기수를 선택해야 합니다.
          </p>
        </div>
      </div>
    );
  }

  // 공지 정렬: 최신순 (createdAt 내림차순)
  const sortedNotices = [...filteredNotices].sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">공지사항</h1>
        <p className="text-gray-600 mt-2">{selectedCohort?.name || selectedCohortId} 공지사항</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 공지</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{filteredNotices.length}개</p>
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
                {filteredNotices.filter((n) => n.imageUrl).length}개
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
        cohortName={selectedCohort?.name || selectedCohortId}
        cohortId={selectedCohortId}
        onCreateNotice={() => router.push('/datacntr/notices/create')}
        onUseTemplate={handleAddTemplate}
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
      {showTemplateSelector && (
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
          onSuccess={handleSaveAsTemplateSuccess}
        />
      )}
    </div>
  );
}
