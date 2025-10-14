'use client';

import Image from 'next/image';
import { Book } from 'lucide-react';

interface BookCoverImageProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 책 표지 이미지 컴포넌트
 *
 * 이미지가 없으면 책 아이콘 표시
 */
export function BookCoverImage({ src, alt, size = 'sm' }: BookCoverImageProps) {
  const dimensions = {
    sm: { width: 'w-12', height: 'h-16', iconSize: 'h-6 w-6' },
    md: { width: 'w-20', height: 'h-28', iconSize: 'h-8 w-8' },
    lg: { width: 'w-32', height: 'h-44', iconSize: 'h-12 w-12' },
  }[size];

  if (!src) {
    return (
      <div className={`${dimensions.width} ${dimensions.height} flex-shrink-0 bg-gray-100 rounded flex items-center justify-center`}>
        <Book className={`${dimensions.iconSize} text-gray-400`} />
      </div>
    );
  }

  return (
    <div className={`relative ${dimensions.width} ${dimensions.height} flex-shrink-0 bg-gray-100 rounded overflow-hidden`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 48px, 64px"
        className="object-cover"
      />
    </div>
  );
}
