import { RefObject, useMemo } from 'react';
import NoticeItem from '@/components/NoticeItem';
import { Notice } from '@/types/database';
import { formatDate, formatTime } from '@/lib/utils';
import { getTimestampMillis } from '@/lib/firebase/timestamp-utils';

interface NoticeTimelineProps {
  notices: Notice[];
  isAdmin: boolean;
  onEdit: (notice: Notice) => void;
  onRequestDelete: (notice: Notice) => void;
  latestNoticeId?: string;
  latestNoticeRef?: RefObject<HTMLDivElement>;
}

type GroupedNotice = {
  timestamp: number;
  label: string;
  notices: Notice[];
};

export function NoticeTimeline({
  notices,
  isAdmin,
  onEdit,
  onRequestDelete,
  latestNoticeId,
  latestNoticeRef,
}: NoticeTimelineProps) {
  // 추가 방어: 관리자가 아니면 draft 제외 + createdAt 없는 notice 제외
  // isAdmin은 ViewMode가 아닌 participant.isAdministrator 기반이어야 함
  const filteredNotices = useMemo(() => {
    // createdAt이 없는 notice 필터링 (데이터 무결성 보장)
    const validNotices = notices.filter(notice => notice.createdAt);

    // 관리자는 draft 포함 모든 공지 표시
    if (isAdmin) {
      return validNotices;
    }
    // 일반 참가자: draft 제외, status 없으면 published로 간주
    return validNotices.filter(notice => notice.status !== 'draft');
  }, [notices, isAdmin]);

  const grouped = useMemo(() => {
    const groups = filteredNotices.reduce<Record<string, GroupedNotice>>((acc, notice) => {
      const dateKey = formatDate(notice.createdAt);
      if (!acc[dateKey]) {
        acc[dateKey] = {
          timestamp: getTimestampMillis(notice.createdAt),
          label: dateKey,
          notices: [],
        };
      }
      acc[dateKey].notices.push(notice);
      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredNotices]);

  if (grouped.length === 0) {
    return null;
  }

  return grouped.map(({ label, notices: dateNotices }) => (
    <div key={label}>
      <div className="container mx-auto max-w-3xl px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            {label}
          </span>
          <div className="h-px flex-1 bg-border" />
       </div>
      </div>

      {dateNotices.map((notice) => {
        const isLatest = notice.id === latestNoticeId;
        return (
          <div
            key={notice.id}
            ref={isLatest ? latestNoticeRef : undefined}
            className="group transition-colors duration-normal hover:bg-muted/50"
          >
            <div className="container mx-auto max-w-3xl px-4 py-3">
              <NoticeItem
                notice={notice}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onDelete={onRequestDelete}
                formatTime={formatTime}
                priority={isLatest && !!notice.imageUrl}
              />
            </div>
          </div>
        );
      })}
    </div>
  ));
}

export default NoticeTimeline;
