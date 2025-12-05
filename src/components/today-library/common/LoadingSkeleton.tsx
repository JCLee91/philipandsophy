'use client';

import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';

export default function LoadingSkeleton() {
  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden">
        <TopBar title="오늘의 서재" />
        <main className="app-main-content flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-md px-6 w-full">
            <div className="pb-6">
              <div className="flex flex-col gap-12">
                <div className="flex flex-col gap-3">
                  <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                </div>
                {/* Bookmark Cards Skeleton */}
                <div className="flex flex-col w-full">
                  <div className="h-24 bg-gray-100 rounded animate-pulse mb-4" />
                  <div className="h-24 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
