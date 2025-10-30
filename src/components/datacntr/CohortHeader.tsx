'use client';

import { PenSquare, MoreVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface CohortHeaderProps {
  cohortName: string;
  cohortId: string;
  onCreateNotice: () => void;
  onUseTemplate: () => void;
  onManageTemplates: () => void;
}

export default function CohortHeader({
  cohortName,
  cohortId,
  onCreateNotice,
  onUseTemplate,
  onManageTemplates,
}: CohortHeaderProps) {
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
    <div className="flex items-center justify-between mb-4">
      {/* 기수명 */}
      <h2 className="text-xl font-bold text-gray-900">{cohortName}</h2>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2">
        {/* Primary CTA: 공지 작성 */}
        <button
          type="button"
          onClick={onCreateNotice}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          <PenSquare className="h-4 w-4" />
          공지 작성
        </button>

        {/* Secondary Actions: 더보기 메뉴 */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center justify-center p-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            title="더보기"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                type="button"
                onClick={() => {
                  onUseTemplate();
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                템플릿 사용
              </button>
              <button
                type="button"
                onClick={() => {
                  onManageTemplates();
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                템플릿 관리
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
