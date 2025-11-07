'use client';

import { Edit, MoreVertical, Save, Trash2, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { formatTimestampKST } from '@/lib/datacntr/timestamp';
import type { Notice } from '@/types/database';

interface NoticeWithCohort extends Notice {
  cohortName: string;
}

interface NoticeCardProps {
  notice: NoticeWithCohort;
  onEdit: () => void;
  onSaveAsTemplate: () => void;
  onDelete: () => void;
}

export default function NoticeCard({
  notice,
  onEdit,
  onSaveAsTemplate,
  onDelete,
}: NoticeCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-start gap-3 p-4">
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs">
              <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
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

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Primary: Edit */}
              <button
                type="button"
                onClick={onEdit}
                className="p-1.5 text-gray-600 rounded hover:text-black hover:bg-gray-100 transition-colors"
                title="편집"
              >
                <Edit className="h-4 w-4" />
              </button>

              {/* Secondary: More Actions */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-1.5 text-gray-600 rounded hover:text-black hover:bg-gray-100 transition-colors"
                  title="더보기"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      type="button"
                      onClick={() => {
                        onSaveAsTemplate();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      템플릿으로 저장
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        onDelete();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
            {notice.content}
          </p>

          {/* Image */}
          {notice.imageUrl && (
            <div className="mt-2">
              <Image
                src={notice.imageUrl}
                alt="공지 이미지"
                width={200}
                height={150}
                className="max-w-[200px] rounded border border-gray-200 h-auto"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
