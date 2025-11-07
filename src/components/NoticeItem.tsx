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
import { Pencil, Trash2, MoreVertical } from 'lucide-react';
import Image from 'next/image';
import { getResizedImageUrl } from '@/lib/image-utils';
import { Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import ImageViewerDialog from '@/components/ImageViewerDialog';

interface NoticeItemProps {
  notice: Notice;
  isAdmin: boolean;
  onEdit: (notice: Notice) => void;
  onDelete: (notice: Notice) => void;
  formatTime: (timestamp: Timestamp) => string;
  priority?: boolean; // LCP 최적화: 첫 번째 공지 이미지에 priority 추가
}

export default function NoticeItem({
  notice,
  isAdmin,
  onEdit,
  onDelete,
  formatTime,
  priority = false,
}: NoticeItemProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
            <span className="text-xs text-muted-foreground">
              {formatTime(notice.createdAt)}
            </span>
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-normal p-0.5 hover:bg-muted rounded">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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

        <div className="space-y-2">
          {notice.imageUrl && (
            <div className="w-full max-w-lg mx-auto">
              <div
                className="relative w-full overflow-hidden rounded cursor-pointer hover:opacity-90 transition-opacity duration-fast"
                onClick={() => setSelectedImage(notice.imageUrl || null)}
              >
                <Image
                  src={getResizedImageUrl(notice.imageUrl) || notice.imageUrl}
                  alt="공지 이미지"
                  width={600}
                  height={400}
                  className="object-contain w-full h-auto"
                  priority={priority}
                />
              </div>
            </div>
          )}

          <div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
              {notice.content
                .split(/(https?:\/\/[^\s]+)/g)
                .map((part, i) =>
                  part.match(/https?:\/\/[^\s]+/) ? (
                    <a
                      key={i}
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1264a3] hover:underline"
                      onClick={(e) => {
                        // PWA 환경에서 외부 브라우저로 강제 열기
                        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
                        if (isPWA) {
                          e.preventDefault();
                          const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
                          if (isIOS) {
                            // iOS PWA: Safari로 열기
                            window.location.href = `x-safari-${part}`;
                          } else {
                            // Android PWA: width/height 파라미터로 브라우저에서 열기
                            window.open(part, '_blank', 'width=800,height=600,noopener,noreferrer');
                          }
                        }
                      }}
                    >
                      {part}
                    </a>
                  ) : (
                    part
                  )
                )}
            </p>
          </div>
        </div>
      </div>

      {/* 이미지 뷰어 */}
      <ImageViewerDialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
        imageUrl={selectedImage || ''}
      />
    </div>
  );
}
