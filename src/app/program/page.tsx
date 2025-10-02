'use client';

import '../../styles/landing.css';

export default function ProgramPage() {
  // Program_01.webp ~ Program_18.webp 경로 생성 (v=2.1 for cache busting)
  const images = Array.from({ length: 18 }, (_, i) => ({
    src: `/image/Program/Program_${String(i + 1).padStart(2, '0')}.webp?v=2.1`,
    alt: `필립앤소피 프로그램 소개 ${i + 1}`,
  }));

  return (
    <div style={{ width: '100%', padding: '0 12px' }}>
      {images.map((image, idx) => (
        <img
          key={idx}
          src={image.src}
          alt={image.alt}
          style={{ 
            width: '100%', 
            height: 'auto', 
            display: 'block',
            marginBottom: idx === images.length - 1 ? 0 : '0'
          }}
          loading={idx === 0 ? 'eager' : 'lazy'}
          fetchPriority={idx === 0 ? 'high' : 'auto'}
        />
      ))}
    </div>
  );
}

