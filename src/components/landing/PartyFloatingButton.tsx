'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getImageUrl } from '@/constants/landing';

export default function PartyFloatingButton() {
  const pathname = usePathname();

  // 시크릿 파티 페이지에서는 버튼 숨김
  if (pathname === '/secret-party') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1001] pointer-events-none flex justify-center">
      <div className="relative w-full max-w-[500px]">
        <Link
          href="/secret-party"
          aria-label="연말 파티 안내 보기"
          className="absolute bottom-[160px] right-6 pointer-events-auto group"
        >
          <div className="relative h-[85px] w-[85px] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-2 hover:scale-110">
            {/* Strongest outer glow for maximum visibility */}
            <div className="absolute inset-[-12px] rounded-full bg-gradient-to-br from-red-500/60 to-green-500/60 blur-2xl opacity-75 animate-[pulse_2s_ease-in-out_infinite] group-hover:opacity-100 transition-opacity" />

            {/* Secondary glow layer */}
            <div className="absolute inset-[-6px] rounded-full bg-gradient-to-br from-red-400/50 to-green-400/50 blur-xl opacity-60 animate-[pulse_2.5s_ease-in-out_infinite_0.3s] group-hover:opacity-80 transition-opacity" />

            {/* White highlight glow for depth */}
            <div className="absolute inset-[-4px] rounded-full bg-white/30 blur-lg opacity-50 animate-[pulse_3s_ease-in-out_infinite_0.6s] group-hover:opacity-70 transition-opacity" />

            {/* Main button image with enhanced shadow */}
            <div className="relative h-full w-full">
              <Image
                src={getImageUrl('/image/landing/party-button.png')}
                alt="멤버스 파티 알아보기"
                width={85}
                height={85}
                className="relative z-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_15px_40px_rgba(0,0,0,0.7)] transition-all"
                priority
              />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
