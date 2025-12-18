'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Users } from 'lucide-react';

interface Member {
  id: string;
  profileImage: string | null;
  displayName: string;
}

interface MemberShowcaseProps {
  members: Member[];
  totalCount: number;
}

export default function MemberShowcase({ members, totalCount }: MemberShowcaseProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  // 무한 스크롤을 위해 멤버 배열 복제
  const extendedMembers = [...members, ...members, ...members];

  // 자동 스크롤
  useEffect(() => {
    if (!isAutoScrolling || !scrollRef.current) return;

    const scrollContainer = scrollRef.current;
    let animationId: number;
    let scrollPosition = scrollContainer.scrollLeft;

    const scroll = () => {
      scrollPosition += 0.5; // 스크롤 속도

      // 무한 루프: 중간 지점에서 시작, 끝에 도달하면 중간으로 리셋
      const maxScroll = scrollContainer.scrollWidth / 3;
      if (scrollPosition >= maxScroll * 2) {
        scrollPosition = maxScroll;
      }

      scrollContainer.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(scroll);
    };

    // 초기 위치를 중간으로 설정
    scrollContainer.scrollLeft = scrollContainer.scrollWidth / 3;
    scrollPosition = scrollContainer.scrollLeft;

    animationId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationId);
  }, [isAutoScrolling, members]);

  // 터치/마우스 인터랙션 시 자동 스크롤 일시 정지
  const handleInteractionStart = () => setIsAutoScrolling(false);
  const handleInteractionEnd = () => {
    // 3초 후 자동 스크롤 재개
    setTimeout(() => setIsAutoScrolling(true), 3000);
  };

  if (!members || members.length === 0) return null;

  return (
    <section className="w-full bg-gradient-to-b from-black to-gray-900 py-12 md:py-16 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4">
        {/* 섹션 제목 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            함께할 멤버들을 소개합니다
          </h2>
          <p className="text-gray-400">
            다양한 분야의 멤버들이 함께하고 있어요
          </p>
        </motion.div>

        {/* 멤버 캐러셀 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide py-4"
            style={{ scrollBehavior: 'auto' }}
            onMouseDown={handleInteractionStart}
            onMouseUp={handleInteractionEnd}
            onMouseLeave={handleInteractionEnd}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
          >
            {extendedMembers.map((member, index) => (
              <div
                key={`${member.id}-${index}`}
                className="flex-shrink-0 flex flex-col items-center gap-2"
              >
                {/* 프로필 이미지 */}
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 shadow-lg">
                  {member.profileImage ? (
                    <Image
                      src={member.profileImage}
                      alt={member.displayName}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                      <span className="text-2xl text-amber-400 font-bold">
                        {member.displayName[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* 마스킹된 이름 */}
                <span className="text-xs md:text-sm text-gray-400 font-medium">
                  {member.displayName}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 총 멤버 수 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center justify-center gap-2 mt-6"
        >
          <Users className="w-5 h-5 text-amber-400" />
          <span className="text-gray-300 font-medium">
            현재 <span className="text-amber-400 font-bold">{totalCount}명</span>의 멤버가 활동 중
          </span>
        </motion.div>
      </div>

      {/* 스크롤바 숨기기 */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
