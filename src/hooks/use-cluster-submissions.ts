'use client';

import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ReadingSubmission } from '@/types/database';

/**
 * 클러스터 멤버들의 특정 날짜 인증 데이터 조회
 * 
 * @param participantIds 클러스터 멤버 ID 배열
 * @param submissionDate 인증 날짜 (YYYY-MM-DD)
 * @param enabled 쿼리 활성화 여부
 * @returns Record<participantId, ReadingSubmission>
 */
export function useClusterSubmissions(
    participantIds: string[],
    submissionDate: string,
    enabled: boolean = true
) {
    return useQuery({
        queryKey: ['cluster-submissions', participantIds, submissionDate],
        queryFn: async (): Promise<Record<string, ReadingSubmission>> => {
            if (!participantIds.length || !submissionDate) {
                return {};
            }

            const db = getDb();
            const submissionsRef = collection(db, 'reading_submissions');

            // Firestore 'in' 쿼리 제한 (최대 10개) → 청크로 나눠서 조회
            const submissions: ReadingSubmission[] = [];

            for (let i = 0; i < participantIds.length; i += 10) {
                const chunk = participantIds.slice(i, i + 10);

                const q = query(
                    submissionsRef,
                    where('participantId', 'in', chunk),
                    where('submissionDate', '==', submissionDate),
                    where('status', '==', 'approved')
                );

                const snapshot = await getDocs(q);
                submissions.push(
                    ...snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as ReadingSubmission[]
                );
            }

            // Convert array to Record for easy lookup
            const submissionsMap: Record<string, ReadingSubmission> = {};
            submissions.forEach(submission => {
                submissionsMap[submission.participantId] = submission;
            });

            return submissionsMap;
        },
        enabled: enabled && participantIds.length > 0 && !!submissionDate,
        staleTime: 60 * 1000, // 1분
        gcTime: 5 * 60 * 1000, // 5분
    });
}
