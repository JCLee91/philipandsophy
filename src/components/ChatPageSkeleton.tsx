'use client';

/**
 * ChatPage 스켈레톤 컴포넌트
 * 헤더와 공지사항 리스트 로딩 상태 표시 (접근성 개선)
 */

export function HeaderSkeleton() {
  return (
    <div
      className="flex items-center justify-between bg-background px-4 py-3 border-b"
      role="status"
      aria-label="헤더 로딩 중"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full shimmer" aria-hidden="true" />
        <div className="h-6 w-32 rounded shimmer" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg shimmer" aria-hidden="true" />
        <div className="h-9 w-9 rounded-lg shimmer" aria-hidden="true" />
      </div>
      <span className="sr-only">페이지 헤더를 불러오는 중입니다...</span>
    </div>
  );
}

export function NoticeListSkeleton() {
  return (
    <div
      className="flex-1 overflow-y-auto bg-background pb-20"
      role="status"
      aria-label="공지사항 목록 로딩 중"
    >
      <div className="container mx-auto max-w-3xl px-4">
        {/* 날짜 구분선 스켈레톤 */}
        <div className="flex items-center gap-3 py-4" aria-hidden="true">
          <div className="h-px flex-1 shimmer" />
          <div className="h-6 w-24 rounded-full shimmer" />
          <div className="h-px flex-1 shimmer" />
        </div>

        {/* 공지사항 아이템 스켈레톤 (3개) */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-3" aria-hidden="true">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-20 rounded shimmer" />
                  <div className="h-3 w-16 rounded shimmer" />
                </div>
                <div className="space-y-1">
                  <div className="h-4 w-full rounded shimmer" />
                  <div className="h-4 w-4/5 rounded shimmer" />
                </div>
              </div>
            </div>
          </div>
        ))}
        <span className="sr-only">공지사항 목록을 불러오는 중입니다...</span>
      </div>
    </div>
  );
}

export function FooterActionsSkeleton() {
  return (
    <div
      className="shrink-0 border-t bg-white pb-safe"
      role="status"
      aria-label="하단 버튼 로딩 중"
    >
      <div className="mx-auto max-w-md px-6 py-4">
        <div className="grid grid-cols-2 gap-2" aria-hidden="true">
          <div className="h-14 rounded-lg shimmer" />
          <div className="h-14 rounded-lg shimmer" />
        </div>
        <span className="sr-only">액션 버튼을 불러오는 중입니다...</span>
      </div>
    </div>
  );
}
