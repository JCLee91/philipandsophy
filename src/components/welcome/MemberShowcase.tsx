'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Users } from 'lucide-react';

interface Member {
  id: string;
  profileImage: string | null;
}

interface MemberShowcaseProps {
  members?: Member[];
  totalCount: number;
  showHeader?: boolean;
  showFooter?: boolean;
  disclaimer?: string;
  staticImageSrc?: string;
}

export default function MemberShowcase({
  members,
  totalCount,
  showHeader = true,
  showFooter = true,
  disclaimer,
  staticImageSrc
}: MemberShowcaseProps) {
  // If no static image and no members, return null
  if (!staticImageSrc && (!members || members.length === 0)) return null;

  const validMembers = members?.filter(m => m.profileImage) || [];

  // Calculate rows only if using carousel mode
  const perRow = Math.ceil(validMembers.length / 4);
  const rows = !staticImageSrc ? [
    validMembers.slice(0, perRow),
    validMembers.slice(perRow, perRow * 2),
    validMembers.slice(perRow * 2, perRow * 3),
    validMembers.slice(perRow * 3)
  ] : [];

  return (
    <section className={`relative w-full bg-black overflow-hidden ${showHeader ? 'py-16' : 'pb-6'}`}>
      <div className="relative z-20">
        {showHeader && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 px-4 max-w-[500px] mx-auto"
          >
            <span className="text-gray-500 font-medium tracking-widest text-xs uppercase mb-3 block">
              Community
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              함께하는 멤버들
            </h2>
            <p className="text-gray-400">
              다양한 분야의 검증된 멤버들이 당신을 기다립니다
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: showHeader ? 0.2 : 0 }}
          className={staticImageSrc ? "relative max-w-[500px] mx-auto px-4" : "space-y-4 max-w-[500px] mx-auto"}
        >
          {staticImageSrc ? (
            <div className="relative w-full aspect-[1026/1362] rounded-2xl overflow-hidden bg-gray-900 border border-gray-800">
              <Image
                src={staticImageSrc}
                alt="Welcome Members"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 500px"
                priority
              />
            </div>
          ) : (
            <>
              <ScrollingRow members={rows[0]} direction="left" duration={20} />
              <ScrollingRow members={rows[1]} direction="right" duration={25} />
              <ScrollingRow members={rows[2]} direction="left" duration={30} />
              <ScrollingRow members={rows[3]} direction="right" duration={22} />
            </>
          )}
        </motion.div>

        {disclaimer && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mt-6 px-4"
          >
            <p className="text-gray-500 text-xs text-[#999999] opacity-60 font-light tracking-wide">
              {disclaimer}
            </p>
          </motion.div>
        )}

        {showFooter && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-2 mt-10 max-w-[500px] mx-auto px-4"
          >
            <Users className="w-5 h-5 text-[#62bbff]" />
            <span className="text-gray-300 font-medium">
              <span className="text-[#62bbff] font-bold">{totalCount}명</span>의 멤버가 활동 중
            </span>
          </motion.div>
        )}
      </div>

      {!staticImageSrc && (
        <style jsx global>{`
          @keyframes pns-marquee-left {
            from { transform: translate3d(0, 0, 0); }
            to { transform: translate3d(var(--pns-marquee-distance, -50%), 0, 0); }
          }

          @keyframes pns-marquee-right {
            from { transform: translate3d(var(--pns-marquee-distance, -50%), 0, 0); }
            to { transform: translate3d(0, 0, 0); }
          }

          .pns-marquee-row {
            isolation: isolate;
            contain: layout paint;
          }

          .pns-marquee-track {
            will-change: transform;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            transform: translate3d(0, 0, 0);
            -webkit-transform-style: preserve-3d;
            transform-style: preserve-3d;
          }

          .pns-marquee-item {
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            transform: translate3d(0, 0, 0);
            -webkit-transform-style: preserve-3d;
            transform-style: preserve-3d;
          }

          .pns-marquee-item img {
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
          }

          @media (prefers-reduced-motion: reduce) {
            .pns-marquee-track {
              animation: none !important;
              transform: none !important;
            }
          }
        `}</style>
      )}
    </section>
  );
}

interface ScrollingRowProps {
  members: Member[];
  direction: 'left' | 'right';
  duration: number;
}

function ScrollingRow({ members, direction, duration }: ScrollingRowProps) {
  if (members.length === 0) return null;

  // 이미지가 있는 멤버만 필터링
  const validMembers = members.filter(m => m.profileImage);
  if (validMembers.length === 0) return null;

  const trackRef = useRef<HTMLDivElement | null>(null);
  const lastDistanceRef = useRef<number>(0);

  const doubledMembers = useMemo(() => [...validMembers, ...validMembers], [validMembers]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const duplicateStart = track.querySelector<HTMLElement>('[data-marquee-dup-start="true"]');
      if (!duplicateStart) return;

      const distance = duplicateStart.offsetLeft - track.offsetLeft;
      // 값이 변경되었을 때만 DOM 업데이트 (리렌더링 없이)
      if (distance > 0 && distance !== lastDistanceRef.current) {
        lastDistanceRef.current = distance;
        track.style.setProperty('--pns-marquee-distance', `-${distance}px`);
      }
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const ro = new ResizeObserver(() => measure());
    ro.observe(track);
    return () => ro.disconnect();
  }, [validMembers.length]);

  const trackStyle: CSSProperties = {
    animation: `${direction === 'left' ? 'pns-marquee-left' : 'pns-marquee-right'} ${duration}s linear infinite`,
  };

  return (
    <div className="relative overflow-hidden pns-marquee-row">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

      <div
        ref={trackRef}
        className="flex w-max gap-4 pns-marquee-track"
        style={trackStyle}
      >
        {doubledMembers.map((member, index) => {
          const isDuplicate = index >= validMembers.length;
          const isDuplicateStart = index === validMembers.length;

          return (
            <div
              key={`${isDuplicate ? 'b' : 'a'}-${member.id}-${index}`}
              data-marquee-dup-start={isDuplicateStart ? 'true' : undefined}
              aria-hidden={isDuplicate ? true : undefined}
              className="flex-shrink-0 relative w-14 h-[76px] md:w-16 md:h-24 rounded-lg overflow-hidden bg-gray-900 border border-gray-800 select-none pns-marquee-item"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              <Image
                src={member.profileImage!}
                alt=""
                fill
                className="object-cover object-top pointer-events-none"
                sizes="(min-width: 768px) 64px, 56px"
                loading="eager"
                draggable={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
