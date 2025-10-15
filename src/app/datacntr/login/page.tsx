'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmailDomain, ALLOWED_DOMAINS_TEXT } from '@/constants/auth';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DataCenterLoginPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, login } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  // 이미 로그인되어 있으면 대시보드로 리다이렉트
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/datacntr');
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 클라이언트 검증: 이메일 도메인 체크
    if (!validateEmailDomain(email)) {
      setError(`허용되지 않은 도메인입니다. 허용 도메인: ${ALLOWED_DOMAINS_TEXT}`);
      return;
    }

    setIsLoggingIn(true);

    try {
      await login(email, password);

      toast({
        title: '로그인 성공',
        description: 'Data Center에 오신 것을 환영합니다.',
      });

      // 로그인 성공 - 대시보드로 이동
      router.push('/datacntr');
    } catch (error: any) {
      // Firebase Auth 에러 처리
      let errorMessage = '로그인에 실패했습니다.';

      if (error.code === 'auth/user-not-found') {
        errorMessage = '등록되지 않은 이메일입니다.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = '비밀번호가 올바르지 않습니다.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '이메일 형식이 올바르지 않습니다.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast({
        title: '로그인 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 인증 확인 중
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 이미 로그인되어 있으면 null 반환 (리다이렉트됨)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* 로고 및 제목 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Data Center</h1>
          <p className="text-gray-600">필립앤소피 데이터 분석 센터</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이메일 입력 */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@wheelslabs.com"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">
                허용 도메인: {ALLOWED_DOMAINS_TEXT}
              </p>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </button>
          </form>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            관리자 전용 페이지입니다.
            <br />
            허용된 도메인의 이메일만 접근 가능합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
