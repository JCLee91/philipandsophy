'use client';

/**
 * PostProgramView 미리보기 페이지 (개발 전용)
 * 인증 없이 직접 컴포넌트를 렌더링해서 테스트
 * 
 * URL: /dev/preview-post-program?cohort=0&user=test-user-01
 */

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import PostProgramView from '@/components/today-library/PostProgramView';
import type { Cohort } from '@/types/database';

function PreviewContent() {
    const searchParams = useSearchParams();
    const cohortId = searchParams.get('cohort') || '0';
    const userId = searchParams.get('user') || 'test-user-01';
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // 기수 정보 조회
    const { data: cohort, isLoading: cohortLoading } = useQuery<Cohort>({
        queryKey: ['preview-cohort', cohortId],
        queryFn: async () => {
            const db = getDb();
            const cohortDoc = await getDoc(doc(db, 'cohorts', cohortId));
            if (!cohortDoc.exists()) throw new Error('Cohort not found');
            return { id: cohortDoc.id, ...cohortDoc.data() } as Cohort;
        },
        enabled: isClient,
    });

    if (!isClient || cohortLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p>로딩 중...</p>
            </div>
        );
    }

    if (!cohort) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-red-500">기수를 찾을 수 없습니다: {cohortId}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* 개발 정보 배너 */}
            <div className="bg-yellow-100 border-b border-yellow-300 p-2 text-center text-sm">
                🔧 <strong>개발 미리보기</strong> | cohort: {cohortId} | user: {userId} | endDate: {cohort.endDate}
            </div>

            {/* PostProgramView 렌더링 */}
            <PostProgramView
                cohort={cohort}
                cohortId={cohortId}
                currentUserId={userId}
            />
        </div>
    );
}

export default function PreviewPostProgramPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <p>로딩 중...</p>
            </div>
        }>
            <PreviewContent />
        </Suspense>
    );
}
