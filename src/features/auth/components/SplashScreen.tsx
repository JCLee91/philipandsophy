'use client';

import Image from 'next/image';

interface SplashScreenProps {
  // duration 제거: 외부에서 제어 (데이터 준비 완료 시까지 표시)
}

export default function SplashScreen({}: SplashScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      {/* 로고를 화면 상단 40% 지점에 배치 (유명 앱 스타일) */}
      <div className="flex flex-col items-center gap-6 -translate-y-[10vh]">
        {/* iOS 스타일 라운드 로고 */}
        <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-sm">
          <Image
            src="/image/logo_app.webp"
            alt="필립앤소피"
            fill
            sizes="128px"
            className="object-cover"
            priority
          />
        </div>
      </div>
    </div>
  );
}
