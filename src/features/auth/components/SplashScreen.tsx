'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export default function SplashScreen({ onFinish, duration = 1500 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // 페이드 아웃 애니메이션 후 완료 콜백
      setTimeout(onFinish, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onFinish]);

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center bg-white
        transition-opacity duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* 로고를 화면 상단 40% 지점에 배치 (유명 앱 스타일) */}
      <div className="flex flex-col items-center gap-6 -translate-y-[10vh]">
        {/* iOS 스타일 라운드 로고 */}
        <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-sm">
          <Image
            src="/image/logo_app.webp"
            alt="필립앤소피"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    </div>
  );
}
