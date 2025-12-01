'use client';

import Image from 'next/image';
import { motion, PanInfo } from 'framer-motion';
import { ONBOARDING_STEPS } from '../constants';

interface InfoStepProps {
  id: number;
  imageSrc: string;
  alt: string;
  title: string;
  buttonText: string;
  onNext: () => void;
  onPrev?: () => void;
}

const SWIPE_THRESHOLD = 50; // 스와이프 감지 최소 거리 (px)
const MAX_SWIPE_STEP = 3; // 스와이프로 이동 가능한 최대 스텝

export default function InfoStep({ id, imageSrc, alt, title, buttonText, onNext, onPrev }: InfoStepProps) {
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset } = info;

    // 왼쪽 스와이프 → 다음 (마지막 스텝이 아닐 때만)
    if (offset.x < -SWIPE_THRESHOLD && id < MAX_SWIPE_STEP) {
      onNext();
    }
    // 오른쪽 스와이프 → 이전 (1번 스텝이 아닐 때만)
    else if (offset.x > SWIPE_THRESHOLD && onPrev && id > 1) {
      onPrev();
    }
  };

  // 스텝별 드래그 방향 제한
  // 1번: 왼쪽만 허용 (오른쪽 모션 차단)
  // 3번: 오른쪽만 허용 (왼쪽 모션 차단)
  // 2번: 양쪽 모두 허용
  const getDragElastic = () => {
    if (id === 1) return { left: 0.2, right: 0 };
    if (id === MAX_SWIPE_STEP) return { left: 0, right: 0.2 };
    return 0.2;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={getDragElastic()}
      onDragEnd={handleDragEnd}
      className="application-container flex h-[100dvh] flex-col text-white cursor-grab active:cursor-grabbing"
    >
      {/* 상단 텍스트 영역 */}
      <div className="pt-[10vh] pb-6 text-center">
        <h2 className="whitespace-pre-line text-2xl md:text-4xl font-semibold leading-snug tracking-tight">
          {title}
        </h2>
      </div>

      {/* 이미지 영역 (중앙 정렬) */}
      <div className="relative flex-1 w-full px-12 pb-6 flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full max-h-[50vh]">
          <Image
            src={imageSrc}
            alt={alt}
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* 하단 영역 (인디케이터 + 버튼) */}
      <div className="w-full pb-10 space-y-6">
        {/* 페이지네이션 인디케이터 */}
        <div className="flex justify-center gap-2">
          {ONBOARDING_STEPS.map((step) => (
            <div
              key={step.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step.id === id
                  ? 'w-6 bg-white'
                  : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* 버튼 - cta-button-white 스타일 적용 */}
        <button
          onClick={onNext}
          className="cta-button-white w-full h-16 py-5 px-8 text-lg"
        >
          {buttonText}
        </button>
      </div>
    </motion.div>
  );
}
