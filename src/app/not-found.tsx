'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

// ✅ Disable static generation for 404 page
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gray-100">
          <span className="text-5xl font-bold text-gray-400">404</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-900">페이지를 찾을 수 없습니다</h1>
          <p className="text-gray-600">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-4 font-bold text-white transition-colors hover:bg-gray-800"
          >
            <Home className="h-5 w-5" />
            홈으로 이동
          </Link>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-4 font-bold text-black transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
            이전 페이지
          </button>
        </div>
      </div>
    </div>
  );
}
