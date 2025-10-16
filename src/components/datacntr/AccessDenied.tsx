'use client';

import { ShieldX } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * 데이터센터 접근 거부 화면
 * isAdministrator=true인 사용자만 datacntr에 접근 가능
 */
export default function AccessDenied() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full text-center">
        {/* 아이콘 */}
        <div className="mb-8 flex justify-center">
          <div className="bg-red-100 rounded-full p-6">
            <ShieldX className="h-16 w-16 text-red-600" />
          </div>
        </div>

        {/* 제목 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          접근 권한이 없습니다
        </h1>

        {/* 설명 */}
        <p className="text-gray-600 mb-2">
          이 페이지는 내부 운영진 전용 데이터 화면입니다.
        </p>
        <p className="text-gray-600 mb-8">
          관리자 권한이 필요합니다.
        </p>

        {/* 버튼 */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.push('/app')}
            className="w-full bg-black rounded-lg px-6 py-4 font-bold text-white transition-colors hover:bg-gray-800"
          >
            홈으로 돌아가기
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full bg-white border border-gray-200 rounded-lg px-6 py-4 font-bold text-black transition-colors hover:bg-gray-50"
          >
            이전 페이지로
          </button>
        </div>

        {/* 추가 안내 */}
        <p className="text-sm text-gray-500 mt-8">
          권한이 필요하신 경우 운영팀에 문의해주세요.
        </p>
      </div>
    </div>
  );
}
