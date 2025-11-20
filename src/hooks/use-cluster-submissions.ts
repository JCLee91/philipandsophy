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

            // 🔧 MOCK DATA: 실제 데이터가 없을 때 더미 데이터 추가 (개발/테스트용)
            if (Object.keys(submissionsMap).length === 0 && participantIds.length > 0) {
                const mockReviews = [
                    "이 책을 읽으면서 삶의 의미에 대해 다시 생각해보게 되었습니다. 특히 주인공이 어려움을 극복하는 과정이 인상 깊었어요.",
                    "저자의 통찰력이 정말 놀라웠습니다. 일상에서 놓치기 쉬운 소중한 가치들을 다시 발견할 수 있었어요.",
                    "예상하지 못한 반전이 있어서 정말 재미있게 읽었습니다. 마지막 장면은 오래도록 기억에 남을 것 같아요.",
                    "문체가 아름답고 서정적이어서 읽는 내내 마음이 편안해졌습니다. 힐링이 되는 책이었어요.",
                ];

                const mockAnswers = [
                    "저는 가족과 함께하는 시간이 가장 소중하다고 생각합니다. 바쁜 일상 속에서도 사랑하는 사람들과의 순간을 놓치지 않으려 노력하고 있어요.",
                    "의미 있는 일을 하며 성장하는 것이 저에게는 가장 중요합니다. 매일 조금씩이라도 발전하는 모습을 보는 게 행복해요.",
                    "타인을 돕고 긍정적인 영향을 주는 삶을 살고 싶습니다. 작은 친절이 세상을 더 따뜻하게 만든다고 믿어요.",
                    "자신을 사랑하고 존중하는 것이 모든 것의 시작이라고 생각합니다. 나 자신과의 관계가 가장 중요한 것 같아요.",
                ];

                const mockQuestion = "당신에게 가장 소중한 가치는 무엇인가요?";

                participantIds.forEach((participantId, index) => {
                    submissionsMap[participantId] = {
                        id: `mock-${participantId}-${submissionDate}`,
                        participantId,
                        participationCode: 'mock-code',
                        bookTitle: '데미안',
                        bookAuthor: '헤르만 헤세',
                        bookCoverUrl: 'https://image.aladin.co.kr/product/134/24/cover500/8937460009_1.jpg',
                        bookImageUrl: undefined,
                        review: mockReviews[index % mockReviews.length],
                        dailyQuestion: mockQuestion,
                        dailyAnswer: mockAnswers[index % mockAnswers.length],
                        submissionDate,
                        status: 'approved',
                        createdAt: {} as any,
                        updatedAt: {} as any,
                    } as ReadingSubmission;
                });
            }

            return submissionsMap;
        },
        enabled: enabled && participantIds.length > 0 && !!submissionDate,
        staleTime: 60 * 1000, // 1분
        gcTime: 5 * 60 * 1000, // 5분
    });
}
