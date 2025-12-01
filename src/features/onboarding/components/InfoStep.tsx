'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ONBOARDING_STEPS } from '../constants';

interface InfoStepProps {
  id: number;
  imageSrc: string;
  alt: string;
  title: string;
  buttonText: string;
  onNext: () => void;
}

export default function InfoStep({ id, imageSrc, alt, title, buttonText, onNext }: InfoStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex h-[100dvh] flex-col bg-black text-white"
    >
      {/* 상단 텍스트 영역 */}
      <div className="pt-[10vh] px-8 pb-8 text-center">
        <h2 className="whitespace-pre-line text-3xl font-bold leading-tight tracking-tight">
          {title}
        </h2>
      </div>

      {/* 이미지 영역 (중앙 정렬) */}
      <div className="relative flex-1 w-full px-8 pb-8 flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full max-h-[60vh]">
           {/* 이미지 비율 유지하며 꽉 차게 */}
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
      <div className="w-full px-8 pb-10 space-y-8">
        {/* 페이지네이션 인디케이터 */}
        <div className="flex justify-center gap-2">
          {ONBOARDING_STEPS.map((step) => (
            <div
              key={step.id}
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                step.id === id ? 'bg-[#3b82f6]' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* 버튼 */}
        <button
          onClick={onNext}
          className="w-full rounded-2xl bg-white py-4 text-lg font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {buttonText}
        </button>
      </div>
    </motion.div>
  );
}
