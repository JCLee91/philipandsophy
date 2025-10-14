'use client';

import { ReactNode } from 'react';
import DataCenterSidebar from './DataCenterSidebar';
import DataCenterHeader from './DataCenterHeader';

interface DataCenterLayoutProps {
  children: ReactNode;
}

export default function DataCenterLayout({ children }: DataCenterLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 사이드바 */}
      <DataCenterSidebar />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col lg:ml-[240px]">
        {/* 헤더 */}
        <DataCenterHeader />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
