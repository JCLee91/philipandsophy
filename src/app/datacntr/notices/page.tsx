'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Bell, Calendar, User, BookTemplate, Save, Settings, Trash2, GripVertical, PenSquare, Edit } from 'lucide-react';
import { useDatacntrStore } from '@/stores/datacntr-store';
import { formatTimestampKST } from '@/lib/datacntr/timestamp';
import type { Notice, Cohort } from '@/types/database';
import NoticeTemplateSelector from '@/components/datacntr/NoticeTemplateSelector';
import SaveAsTemplateModal from '@/components/datacntr/SaveAsTemplateModal';
import { logger } from '@/lib/logger';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';

interface NoticeWithCohort extends Notice {
  cohortName: string;
}

// Sortable Notice Item Component
function SortableNoticeItem({
  notice,
  onSaveAsTemplate,
  onDelete,
  onEdit,
}: {
  notice: NoticeWithCohort;
  onSaveAsTemplate: (noticeId: string) => void;
  onDelete: (noticeId: string, author: string) => void;
  onEdit: (noticeId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: notice.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs">
          <User className="h-3 w-3 text-gray-500" />
          <span className="font-medium text-gray-900">{notice.author}</span>
          {notice.status === 'draft' && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                임시저장
              </span>
            </>
          )}
          {notice.templateId && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                템플릿
              </span>
            </>
          )}
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">
            {formatTimestampKST(notice.createdAt, 'M/d HH:mm')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(notice.id)}
            className="p-1.5 text-gray-600 rounded hover:text-green-600 hover:bg-green-50 transition-colors"
            title="편집"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onSaveAsTemplate(notice.id)}
            className="p-1.5 text-gray-600 rounded hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="템플릿으로 저장"
          >
            <Save className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(notice.id, notice.author)}
            className="p-1.5 text-gray-600 rounded hover:text-red-600 hover:bg-red-50 transition-colors"
            title="삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 내용 */}
      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{notice.content}</p>

      {/* 이미지 */}
      {notice.imageUrl && (
        <div className="mt-2">
          <Image
            src={notice.imageUrl}
            alt="공지 이미지"
            width={200}
            height={150}
            className="max-w-[200px] rounded border border-gray-200 h-auto"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}

export default function NoticesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { selectedCohortId: selectedCohortFilter } = useDatacntrStore();
  const [notices, setNotices] = useState<NoticeWithCohort[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
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
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // API는 배열로 반환함
          setCohorts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        logger.error('기수 목록 조회 실패 (notices-page)', error);
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
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('공지사항 조회 실패');
        }

        const data = await response.json();
        setNotices(data);
      } catch (error) {

      } finally {
        setIsLoading(false);
      }
    };

    fetchNotices();
  }, [user]);

  // 필터링된 공지사항
  const filteredNotices = selectedCohortFilter === 'all'
    ? notices
    : notices.filter(n => n.cohortId === selectedCohortFilter);

  // 기수별 공지 그룹핑
  const cohortGroups = selectedCohortFilter === 'all'
    ? // 전체 기수 보기: 공지가 있는 기수만 표시
      Array.from(new Set(filteredNotices.map((n) => n.cohortId)))
        .map((cohortId) => ({
          cohortId,
          cohortName: filteredNotices.find((n) => n.cohortId === cohortId)?.cohortName || cohortId,
          notices: filteredNotices.filter((n) => n.cohortId === cohortId),
        }))
        .sort((a, b) => b.cohortId.localeCompare(a.cohortId))
    : // 특정 기수 필터: 공지가 없어도 해당 기수 섹션 표시
      [{
        cohortId: selectedCohortFilter,
        cohortName: cohorts.find(c => c.id === selectedCohortFilter)?.name || selectedCohortFilter,
        notices: filteredNotices,
      }];

  // 템플릿 추가 핸들러
  const handleAddTemplate = (cohortId: string) => {
    setSelectedCohortId(cohortId);
    setShowTemplateSelector(true);
  };

  // 템플릿 적용 후 새로고침
  const handleTemplateSuccess = async () => {
    setShowTemplateSelector(false);
    // 공지 목록 새로고침
    if (!user) return;

    const idToken = await user.getIdToken();
    const response = await fetch('/api/datacntr/notices', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setNotices(data);
    }
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

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent, cohortId: string, cohortNotices: NoticeWithCohort[]) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = cohortNotices.findIndex((n) => n.id === active.id);
    const newIndex = cohortNotices.findIndex((n) => n.id === over.id);

    const reorderedNotices = arrayMove(cohortNotices, oldIndex, newIndex);

    // 낙관적 업데이트 (UI 즉시 반영)
    const updatedNotices = notices.map((notice) => {
      if (notice.cohortId !== cohortId) return notice;
      const newPosition = reorderedNotices.findIndex((n) => n.id === notice.id);
      return {
        ...notice,
        order: newPosition + 1, // 1부터 시작
      };
    });
    setNotices(updatedNotices);

    // 서버에 순서 업데이트 요청
    if (!user) return;

    try {
      const idToken = await user.getIdToken();
      const noticeOrders = reorderedNotices.map((notice, index) => ({
        noticeId: notice.id,
        order: index + 1,
      }));

      const response = await fetch('/api/datacntr/notices/reorder', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noticeOrders }),
      });

      if (!response.ok) {
        throw new Error('순서 변경 실패');
      }
    } catch (error) {
      logger.error('공지 순서 변경 실패 (notices-page)', error);
      alert('순서 변경 중 오류가 발생했습니다');
      // 실패 시 원래 데이터로 복구
      await handleTemplateSuccess();
    }
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
      logger.error('공지 삭제 실패 (notices-page)', error);
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">공지사항 분석</h1>
        <p className="text-gray-600 mt-2">
          {selectedCohortFilter === 'all'
            ? '전체 공지사항 내역'
            : `${cohorts.find(c => c.id === selectedCohortFilter)?.name || ''} 공지사항`}
        </p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {selectedCohortFilter === 'all' ? '전체 공지' : '필터링된 공지'}
              </p>
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

      {/* 기수별 공지사항 리스트 */}
      <div className="space-y-6">
        {cohortGroups.map((cohort) => {
          // 공지 정렬: 최신순 (createdAt 내림차순)
          const sortedNotices = cohort.notices.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          });

          return (
          <div key={cohort.cohortId}>
            {/* 기수 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{cohort.cohortName}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/datacntr/notices/create?cohortId=${cohort.cohortId}`)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <PenSquare className="h-4 w-4" />
                  공지 작성
                </button>
                <button
                  type="button"
                  onClick={() => handleAddTemplate(cohort.cohortId)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <BookTemplate className="h-4 w-4" />
                  템플릿 사용
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/datacntr/notice-templates')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  템플릿 관리
                </button>
              </div>
            </div>

            {/* 공지 목록 */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, cohort.cohortId, sortedNotices)}
            >
              <SortableContext
                items={sortedNotices.map((n) => n.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sortedNotices.map((notice) => (
                    <SortableNoticeItem
                      key={notice.id}
                      notice={notice}
                      onSaveAsTemplate={handleSaveAsTemplate}
                      onDelete={handleDeleteNotice}
                      onEdit={(noticeId) => router.push(`/datacntr/notices/edit/${noticeId}`)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {cohort.notices.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500 text-sm">이 기수에는 아직 공지가 없습니다</p>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {filteredNotices.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            {selectedCohortFilter === 'all'
              ? '등록된 공지사항이 없습니다'
              : '해당 기수에 등록된 공지사항이 없습니다'}
          </p>
        </div>
      )}

      {/* 템플릿 선택 모달 */}
      {showTemplateSelector && (
        <NoticeTemplateSelector
          cohortId={selectedCohortId}
          onClose={() => setShowTemplateSelector(false)}
          onSuccess={handleTemplateSuccess}
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
