'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface HeaderNavigationProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export default function HeaderNavigation({
  title,
  showBackButton = true,
  onBackClick,
}: HeaderNavigationProps) {
  const router = useRouter();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b bg-white safe-area-header">
      <div className="flex gap-3 items-center px-4 h-14">
        {showBackButton ? (
          <button
            onClick={handleBackClick}
            className="shrink-0 size-6 overflow-hidden"
            aria-label="뒤로가기"
          >
            <Image
              src="/icons/arrow-back.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        ) : (
          <div className="shrink-0 size-6" aria-hidden="true" />
        )}

        <h1 className="flex-1 font-semibold text-lg leading-[1.4] text-black" style={{ letterSpacing: '-0.18px' }}>
          {title}
        </h1>

        <div className="shrink-0 size-6" aria-hidden="true">
          {/* Placeholder for right action */}
        </div>
      </div>
      <style jsx>{`
        .safe-area-header {
          padding-top: env(safe-area-inset-top);
        }

        /* iOS 11.2 이전 버전 호환성 */
        @supports (padding-top: constant(safe-area-inset-top)) {
          .safe-area-header {
            padding-top: constant(safe-area-inset-top);
          }
        }
      `}</style>
    </div>
  );
}
