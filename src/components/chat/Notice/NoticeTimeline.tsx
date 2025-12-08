import { RefObject, useMemo } from 'react';
import NoticeItem from '@/components/NoticeItem';
import { Notice } from '@/types/database';
import { formatDate, formatTime } from '@/lib/utils';
import { getTimestampMillis } from '@/lib/firebase/timestamp-utils';
import { isPublishedNotice } from '@/lib/firebase/notice-utils';

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
  // 공지 필터링: scheduled는 모두에게 숨김, draft는 관리자만 표시
  const filteredNotices = useMemo(() => {
    // scheduled 상태는 항상 제외 (예약 시간 전까지 앱에서 숨김)
    const withoutScheduled = notices.filter(n => n.status !== 'scheduled');

    if (isAdmin) {
      // 관리자: draft + published 표시
      return withoutScheduled;
    }
    // 일반 참가자: published만 표시 (draft 제외)
    return withoutScheduled.filter(isPublishedNotice);
  }, [notices, isAdmin]);

  const grouped = useMemo(() => {
    const groups = filteredNotices.reduce<Record<string, GroupedNotice>>((acc, notice) => {
      // 예약 발행된 공지는 scheduledAt을 사용, 그 외는 createdAt 사용
      const displayTimestamp = notice.scheduledAt || notice.createdAt;
      const dateKey = formatDate(displayTimestamp);
      if (!acc[dateKey]) {
        acc[dateKey] = {
          timestamp: getTimestampMillis(displayTimestamp),
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

  return (
    <div className="flex flex-col-reverse">
      {grouped.map(({ label, notices: dateNotices }) => (
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

          <div className="flex flex-col-reverse">
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
        </div>
      ))}
    </div>
  );
}

export default NoticeTimeline;
