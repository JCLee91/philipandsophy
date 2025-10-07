'use client';

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
  const themeConfig = {
    blue: {
      ribbon: 'bg-[#45a1fd]',
      background: 'bg-[#cee7ff]',
      // Exact SVG from Figma (node-id: 42159-1614)
      flagSvg: 'http://localhost:3845/assets/7891009aef37f60e2facf1b42ffa03e11cd9bc9c.svg',
      // Lock icon SVG from Figma
      lockSvg: 'http://localhost:3845/assets/bc9718f77d885f227f437f4c9e13800d9f8e893d.svg',
    },
    yellow: {
      ribbon: 'bg-[#ffd362]',
      background: 'bg-[#fff2d2]',
      // Exact SVG from Figma (node-id: 42159-1628)
      flagSvg: 'http://localhost:3845/assets/0df77ff303f6a34f14ee7911642215c91f6c0a9f.svg',
      // Lock icon SVG from Figma
      lockSvg: 'http://localhost:3845/assets/bc9718f77d885f227f437f4c9e13800d9f8e893d.svg',
    },
  };

  const config = themeConfig[theme];

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative group transition-transform duration-200 hover:scale-105 active:scale-95"
      style={{ width: '100px', height: '120px' }}
    >
      {/* Bookmark Ribbon (extends 20px above card) */}
      <div
        className={`absolute left-0 top-0 w-[10px] h-[140px] ${config.ribbon} transition-all duration-200`}
      />

      {/* Card Background */}
      <div
        className={`absolute left-0 top-[20px] w-full h-full rounded-br-[12px] rounded-tr-[12px] overflow-clip ${config.background}`}
      >
        {/* Ribbon Flag (exact SVG from Figma) */}
        <div className="absolute left-[69px] top-0 w-[21px] h-[32px]">
          <img
            alt=""
            src={config.flagSvg}
            className="block max-w-none size-full"
          />
        </div>

        {/* Profile Content Container */}
        <div className="absolute left-[25px] top-[16px] w-[60px] flex flex-col items-center gap-[6px]">
          {isLocked ? (
            // Locked state: Blurred 50x50px profile centered with specific positioning
            <div className="relative h-[50px] w-[60px] flex items-center justify-center">
              <div className="blur-[5px] filter size-[50px]">
                <div className="relative size-full rounded-full overflow-hidden">
                  <Image
                    src={profileImage}
                    alt="???"
                    fill
                    className="object-cover"
                    sizes="50px"
                  />
                </div>
              </div>
            </div>
          ) : (
            // Unlocked state: Clear 58x58px profile
            <div className="relative w-[58px] h-[58px] rounded-full overflow-hidden">
              <Image
                src={profileImage}
                alt={name}
                fill
                className="object-cover"
                sizes="58px"
              />
            </div>
          )}

          {/* Name Label (only for unlocked state) */}
          {!isLocked && (
            <div className="flex flex-col items-start w-full">
              <p className="font-[family-name:var(--font-pretendard)] font-semibold text-[16px] leading-[1.4] text-[#31363e] text-center w-full">
                {name}
              </p>
            </div>
          )}
        </div>

        {/* Lock Icon (only for locked state) - EXACT 48x48px from Figma */}
        {isLocked && (
          <div className="absolute left-[31px] top-[68px] size-[48px]">
            <img
              alt=""
              src={config.lockSvg}
              className="block max-w-none size-full"
            />
          </div>
        )}
      </div>
    </button>
  );
}
