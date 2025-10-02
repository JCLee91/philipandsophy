'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Notice } from '@/types/database';
import { APP_CONSTANTS } from '@/constants/app';
import { Pin, PinOff, Pencil, Trash2, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';

interface NoticeItemProps {
  notice: Notice;
  isAdmin: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (noticeId: string) => void;
  onTogglePin: (notice: Notice) => void;
  onEdit: (notice: Notice) => void;
  onDelete: (notice: Notice) => void;
  formatTime: (timestamp: Timestamp) => string;
}

export default function NoticeItem({
  notice,
  isAdmin,
  isCollapsed = false,
  onToggleCollapse,
  onTogglePin,
  onEdit,
  onDelete,
  formatTime,
}: NoticeItemProps) {
  const contentLines = notice.content.split('\n');
  const isLongContent = contentLines.length >= 2 || notice.imageUrl;
  const showCollapseButton = notice.isPinned && isLongContent && onToggleCollapse;

  return (
    <div className="flex gap-3 items-start">
      <Avatar className="mt-1 h-9 w-9 shrink-0">
        <AvatarImage src="/favicon.webp" alt={APP_CONSTANTS.ADMIN_NAME} />
        <AvatarFallback className="bg-primary text-xs text-primary-foreground">
          필
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-foreground">
              {notice.author}
            </span>
            {notice.isPinned && (
              <Pin className="h-3.5 w-3.5 text-primary fill-primary" />
            )}
            <span className="text-xs text-muted-foreground">
              {formatTime(notice.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {showCollapseButton && (
              <button
                onClick={() => onToggleCollapse!(notice.id)}
                className="p-0.5 hover:bg-muted rounded transition-colors"
                title={isCollapsed ? '펼치기' : '접기'}
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
            )}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onTogglePin(notice)}>
                    {notice.isPinned ? (
                      <>
                        <PinOff className="mr-2 h-4 w-4" />
                        고정 해제
                      </>
                    ) : (
                      <>
                        <Pin className="mr-2 h-4 w-4" />
                        상단 고정
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(notice)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(notice)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className={showCollapseButton && isCollapsed ? 'line-clamp-2' : ''}>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
              {notice.content
                .split(/(https?:\/\/[^\s]+)/g)
                .map((part, i) =>
                  part.match(/https?:\/\/[^\s]+/) ? (
                    <a
                      key={i}
                      href={part}
                      className="text-[#1264a3] hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {part}
                    </a>
                  ) : (
                    part
                  )
                  )}
            </p>
          </div>

          {!isCollapsed && notice.imageUrl && (
            <div className="max-w-md">
              <div className="relative aspect-video overflow-hidden rounded border">
                <Image
                  src={notice.imageUrl}
                  alt="공지 이미지"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
