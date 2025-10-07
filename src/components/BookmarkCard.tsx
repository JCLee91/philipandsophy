'use client';

import { Lock } from 'lucide-react';
import Image from 'next/image';

interface BookmarkCardProps {
  profileImage: string;
  name: string;
  theme: 'blue' | 'yellow';
  isLocked: boolean;
  onClick: () => void;
}

export default function BookmarkCard({
  profileImage,
  name,
  theme,
  isLocked,
  onClick,
}: BookmarkCardProps) {
  const themeColors = {
    blue: {
      ribbon: 'bg-[#45a1fd]',
      background: 'bg-[#cee7ff]',
      flag: '#7891009aef37f60e2facf1b42ffa03e11cd9bc9c', // Blue flag SVG
    },
    yellow: {
      ribbon: 'bg-[#ffd362]',
      background: 'bg-[#fff2d2]',
      flag: '#0df77ff303f6a34f14ee7911642215c91f6c0a9f', // Yellow flag SVG
    },
  };

  const colors = themeColors[theme];

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative group transition-transform duration-200 hover:scale-105 active:scale-95"
      style={{ width: '100px', height: '120px' }}
    >
      {/* Bookmark Ribbon (extends 20px above card) */}
      <div
        className={`absolute left-0 top-0 w-[10px] h-[140px] ${colors.ribbon} transition-all duration-200`}
      />

      {/* Card Background */}
      <div
        className={`absolute left-0 top-[20px] w-full h-full rounded-br-[12px] rounded-tr-[12px] overflow-clip ${colors.background}`}
      >
        {/* Ribbon Flag (decorative element top-right) */}
        <div className="absolute right-0 top-0 w-[21px] h-[32px] opacity-80">
          {/* SVG Flag - Placeholder for now */}
          <div className={`w-full h-full ${colors.ribbon}`} style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)'
          }} />
        </div>

        {/* Profile Content Container */}
        <div className="absolute left-[25px] top-[16px] w-[60px] flex flex-col items-center gap-[6px]">
          {/* Profile Image (masked circular) */}
          <div className={`relative w-[58px] h-[58px] rounded-full overflow-hidden ${isLocked ? 'blur-[5px]' : ''}`}>
            <Image
              src={profileImage}
              alt={isLocked ? '???' : name}
              fill
              className="object-cover"
              sizes="58px"
            />
          </div>

          {/* Name Label */}
          {!isLocked && (
            <p className="font-semibold text-[16px] leading-[1.4] text-[#31363e] text-center w-full">
              {name}
            </p>
          )}
        </div>

        {/* Lock Icon (only for locked state) */}
        {isLocked && (
          <div className="absolute left-[31px] top-[68px] w-[48px] h-[48px] flex items-center justify-center">
            <Lock className="w-[32px] h-[32px] text-gray-600" strokeWidth={2} />
          </div>
        )}
      </div>
    </button>
  );
}
