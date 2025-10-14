'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ALLOWED_EMAIL_DOMAINS, ALLOWED_PHONE_COUNTRY_CODES } from '@/constants/auth';
import { Loader2, Shield, Mail, Phone, User } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">시스템 설정</h1>
        <p className="text-gray-600 mt-2">Data Center 시스템 정보 및 설정</p>
      </div>

      <div className="space-y-6">
        {/* 현재 사용자 정보 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            현재 사용자
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">이메일</p>
              <p className="text-base font-semibold text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">UID</p>
              <p className="text-sm font-mono text-gray-700">{user.uid}</p>
            </div>
          </div>
        </div>

        {/* 허용된 이메일 도메인 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            허용된 이메일 도메인
          </h2>
          <div className="space-y-2">
            {ALLOWED_EMAIL_DOMAINS.map((domain) => (
              <div
                key={domain}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg"
              >
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">{domain}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            위 도메인의 이메일만 Data Center에 로그인할 수 있습니다.
          </p>
        </div>

        {/* 허용된 전화번호 국가 코드 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="h-5 w-5" />
            허용된 전화번호 국가 코드
          </h2>
          <div className="space-y-2">
            {ALLOWED_PHONE_COUNTRY_CODES.map((code) => (
              <div
                key={code}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg"
              >
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-900">{code}</span>
                <span className="text-xs text-gray-600">(한국)</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            위 국가 코드의 전화번호만 회원가입이 가능합니다.
          </p>
        </div>

        {/* 보안 정보 */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">🔒 보안 정보</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 3단계 도메인 검증: 클라이언트 + Cloud Functions + API</li>
            <li>• Firebase Auth ID Token 기반 인증</li>
            <li>• 웹앱 세션 토큰과 완전 분리</li>
            <li>• SEO 차단: robots.txt, noindex/nofollow</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
