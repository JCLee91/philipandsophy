'use client';

/**
 * BlurDivider - 책장 선반 사이의 구분선 컴포넌트
 *
 * 흰색 여백과 흐릿한 그라데이션 라인으로 구성되어
 * 북마크 카드 행(row) 사이에 시각적 구분을 제공합니다.
 */
export default function BlurDivider() {
  return (
    <>
      {/* White Spacer */}
      <div className="bg-white h-[20px] w-full" />

      {/* Blur Divider */}
      <div className="h-[4px] w-full overflow-hidden">
        <div
          className="h-full w-full"
          style={{
            background: 'linear-gradient(180deg, rgba(56, 56, 56, 0.40) 0%, rgba(108, 108, 108, 0.32) 100%)',
            filter: 'blur(6.128px)'
          }}
        />
      </div>
    </>
  );
}
