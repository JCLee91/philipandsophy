'use client';

import '../../styles/landing.css';
import Footer from '@/components/Footer';

export default function ProgramPage() {
  // Program_01.webp ~ Program_18.webp 경로 생성
  const version = '4.0'; // 무손실 WebP 업데이트 (2025.10.21)
  const images = Array.from({ length: 18 }, (_, i) => ({
    src: `/image/Program/Program_${String(i + 1).padStart(2, '0')}.webp?v=${version}`,
    alt: `필립앤소피 프로그램 소개 ${i + 1}`,
  }));

  return (
    <div className="landing-page">
      <div className="container">
        {images.map((image, idx) => (
          <img
            key={idx}
            src={image.src}
            alt={image.alt}
            className="main-image"
            loading={idx === 0 ? 'eager' : 'lazy'}
            fetchPriority={idx === 0 ? 'high' : 'auto'}
          />
        ))}
      </div>
      <Footer />
    </div>
  );
}

