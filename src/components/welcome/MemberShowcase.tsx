'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Users } from 'lucide-react';

interface Member {
  id: string;
  profileImage: string | null;
}

interface MemberShowcaseProps {
  members: Member[];
  totalCount: number;
  showHeader?: boolean;
  showFooter?: boolean;
}

export default function MemberShowcase({
  members,
  totalCount,
  showHeader = true,
  showFooter = true
}: MemberShowcaseProps) {
  if (!members || members.length === 0) return null;

  const validMembers = members.filter(m => m.profileImage);
  const perRow = Math.ceil(validMembers.length / 4);

  const row1 = validMembers.slice(0, perRow);
  const row2 = validMembers.slice(perRow, perRow * 2);
  const row3 = validMembers.slice(perRow * 2, perRow * 3);
  const row4 = validMembers.slice(perRow * 3);

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
          className="space-y-4 max-w-[500px] mx-auto"
        >
          <ScrollingRow members={row1} direction="left" duration={20} />
          <ScrollingRow members={row2} direction="right" duration={25} />
          <ScrollingRow members={row3} direction="left" duration={30} />
          <ScrollingRow members={row4} direction="right" duration={22} />
        </motion.div>

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

  // Card dimensions for animation calculation
  const cardWidth = 56; // w-14
  const gap = 16; // px (mobile-friendly, WebView-safe)
  const trackWidth = validMembers.length * (cardWidth + gap);

  return (
    <div className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

      <div
        className="flex"
        style={{
          animation: `scroll-${direction} ${duration}s linear infinite`,
        }}
      >
        {/* First track */}
        <div className="flex flex-shrink-0">
          {validMembers.map((member, index) => (
            <div
              key={`a-${member.id}-${index}`}
              className="flex-shrink-0 relative w-14 h-[76px] md:w-16 md:h-24 rounded-lg overflow-hidden bg-gray-900 border border-gray-800 select-none"
              style={{ marginRight: gap }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              <Image
                src={member.profileImage!}
                alt=""
                fill
                className="object-cover object-top pointer-events-none"
                sizes="64px"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        {/* Second track (duplicate for seamless loop) */}
        <div className="flex flex-shrink-0">
          {validMembers.map((member, index) => (
            <div
              key={`b-${member.id}-${index}`}
              className="flex-shrink-0 relative w-14 h-[76px] md:w-16 md:h-24 rounded-lg overflow-hidden bg-gray-900 border border-gray-800 select-none"
              style={{ marginRight: gap }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              <Image
                src={member.profileImage!}
                alt=""
                fill
                className="object-cover object-top pointer-events-none"
                sizes="64px"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-${trackWidth}px); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-${trackWidth}px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
