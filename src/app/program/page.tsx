'use client';

import Image from 'next/image';
import '../../styles/landing.css';
import Footer from '@/components/Footer';


// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';
export default function ProgramPage() {
  // Program_01.webp ~ Program_18.webp 경로 생성
  const version = '5.0'; // 무손실 WebP 업데이트 (2025.10.24)
  const images = Array.from({ length: 18 }, (_, i) => ({
    src: `/image/Program/Program_${String(i + 1).padStart(2, '0')}.webp?v=${version}`,
    alt: `필립앤소피 프로그램 소개 ${i + 1}`,
  }));

  return (
    <div className="landing-page">
      <div className="container">
        {images.map((image, idx) => (
          <Image
            key={idx}
            src={image.src}
            alt={image.alt}
            width={3240}
            height={2880}
            className="main-image"
            priority={idx === 0}
          />
        ))}
      </div>
      <Footer />
    </div>
  );
}
