'use client';

/**
 * 개발 전용 자동 로그인 페이지
 * URL params로 cohortId와 participantId를 받아 세션 설정 후 리다이렉트
 * 
 * 사용법: /dev/auto-login?cohort=0&participant=test-user-01&redirect=/app/chat/today-library
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AutoLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('로그인 중...');

    const cohortId = searchParams.get('cohort');
    const participantId = searchParams.get('participant');
    const redirectUrl = searchParams.get('redirect') || '/app';

    useEffect(() => {
        if (!cohortId || !participantId) {
            setStatus('❌ cohort와 participant 파라미터가 필요합니다');
            return;
        }

        // 세션 스토리지에 참가자 정보 설정 (AuthContext가 읽는 키)
        const sessionData = {
            id: participantId,
            cohortId: cohortId,
            name: '테스트유저',
            isDevLogin: true,
        };

        // localStorage에 저장 (AuthContext 호환)
        localStorage.setItem('pns-auth-participant', JSON.stringify(sessionData));
        localStorage.setItem('pns-auth-cohort-id', cohortId);

        setStatus('✅ 로그인 완료! 리다이렉트 중...');

        // 리다이렉트
        setTimeout(() => {
            window.location.href = redirectUrl + (redirectUrl.includes('?') ? '&' : '?') + 'cohort=' + cohortId;
        }, 500);
    }, [cohortId, participantId, redirectUrl]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <h1 className="text-xl font-bold mb-4">🔧 개발 자동 로그인</h1>
                <p className="text-gray-600">{status}</p>
                <div className="mt-4 text-sm text-gray-400">
                    <p>cohort: {cohortId}</p>
                    <p>participant: {participantId}</p>
                    <p>redirect: {redirectUrl}</p>
                </div>
            </div>
        </div>
    );
}

export default function DevAutoLoginPage() {
    // 프로덕션에서는 비활성화
    if (process.env.NODE_ENV === 'production') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-red-500">이 페이지는 개발 환경에서만 사용 가능합니다.</p>
            </div>
        );
    }

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AutoLoginContent />
        </Suspense>
    );
}
