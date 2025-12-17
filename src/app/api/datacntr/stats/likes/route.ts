import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';
import { logger } from '@/lib/logger';
import type { LikesStats, TopReceiver } from '@/types/datacntr';
import { ACTIVITY_THRESHOLDS } from '@/constants/datacntr';

export async function GET(request: NextRequest) {
    try {
        // Firebase Auth 검증
        const auth = await requireWebAppAdmin(request);
        if (auth.error) {
            return auth.error;
        }

        const { searchParams } = new URL(request.url);
        const cohortId = searchParams.get('cohortId');
        const detailed = searchParams.get('detailed') === 'true';

        const db = getAdminDb();

        // 1. 좋아요 통계 계산을 위한 데이터 준비
        // cohortId가 있으면 해당 참가자들만 필터링 필요
        let targetUserIds: Set<string> | null = null;
        let participantNameMap = new Map<string, string>();
        let activeParticipantCount = 0;

        // 참가자 정보 조회 (이름 매핑 및 활성 인원 카운트용)
        let participantsQuery = db.collection(COLLECTIONS.PARTICIPANTS);
        if (cohortId) {
            participantsQuery = participantsQuery.where('cohortId', '==', cohortId) as any;
        }

        const participantsSnap = await participantsQuery.get();

        // 관리자/고스트 제외 로직
        const validParticipants = participantsSnap.docs.filter(doc => {
            const data = doc.data();
            return !data.isAdministrator && !data.isSuperAdmin && !data.isGhost;
        });

        if (cohortId) {
            targetUserIds = new Set(validParticipants.map(d => d.id));
        }

        // 이름 매핑 생성
        validParticipants.forEach(doc => {
            participantNameMap.set(doc.id, doc.data().name);
        });

        // 활성 사용자(3일 이내 활동) 카운트 - 1인당 평균 계산용
        const now = Date.now();
        activeParticipantCount = validParticipants.filter(doc => {
            const data = doc.data();
            if (!data.lastActivityAt) return false;
            const lastActivityAt = data.lastActivityAt.toDate();
            const daysSinceActivity = Math.floor((now - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceActivity <= ACTIVITY_THRESHOLDS.ACTIVE_DAYS;
        }).length;

        // 2. 전체 좋아요 데이터 조회
        // Likes 컬렉션은 문서 수가 아주 많지는 않을 것으로 가정하고 전체 조회 후 메모리 필터링
        // (만약 수만 건 이상이면 인덱스 추가 및 쿼리 최적화 필요)
        const likesSnap = await db.collection('likes').get();

        let totalLikes = 0;
        let todayLikes = 0;
        const receiverCounts = new Map<string, number>();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Maps for detailed stats
        const giverCounts = new Map<string, number>();
        const pairCounts = new Map<string, number>(); // "giverId_receiverId" -> count
        const submissionLikeCounts = new Map<string, number>(); // "submissionId" -> count
        const contentTypeCounts = { review: 0, answer: 0 };
        const submissionTypeMap = new Map<string, 'review' | 'answer'>(); // submissionId -> type
        const submissionTargetUserMap = new Map<string, string>(); // submissionId -> userId

        likesSnap.docs.forEach(doc => {
            const data = doc.data();
            const createdAt = data.createdAt.toDate();
            const targetUserId = data.targetUserId;
            const userId = data.userId; // 좋아요 누른 사람
            const targetType = data.targetType as 'review' | 'answer';
            const targetId = data.targetId; // {submissionId}_{targetType}

            // ... (existing filtering logic)

            if (targetUserIds && !targetUserIds.has(targetUserId)) {
                return;
            }

            if (!participantNameMap.has(targetUserId)) {
                return;
            }

            // 제외된 유저(관리자 등)가 누른 좋아요도 통계에서 제외할지 여부
            // 여기서는 '받은' 데이터 기준이므로 누른 사람이 관리자여도 포함될 수 있으나,
            // 순수 유저간 인터렉션을 보려면 누른 사람도 필터링하는게 좋음.
            if (!participantNameMap.has(userId)) {
                return;
            }

            totalLikes++;

            // 오늘 생성된 좋아요
            if (createdAt >= todayStart) {
                todayLikes++;
            }

            // 수신자별 카운트
            receiverCounts.set(targetUserId, (receiverCounts.get(targetUserId) || 0) + 1);

            if (detailed) {
                // 발신자별 카운트
                giverCounts.set(userId, (giverCounts.get(userId) || 0) + 1);

                // 콘텐츠 타입별 카운트
                if (targetType === 'review' || targetType === 'answer') {
                    contentTypeCounts[targetType]++;
                }

                // 상호작용 쌍 카운트
                const pairKey = `${userId}_${targetUserId}`;
                pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);

                // 게시물별 좋아요 카운트
                // targetId format: "submissionId_review" or "submissionId_answer"
                let submissionId = targetId;
                if (targetId.endsWith('_review')) {
                    submissionId = targetId.slice(0, -7);
                } else if (targetId.endsWith('_answer')) {
                    submissionId = targetId.slice(0, -7);
                }
                submissionLikeCounts.set(submissionId, (submissionLikeCounts.get(submissionId) || 0) + 1);

                // 메타데이터 저장 (나중에 fetch 줄이기 위해)
                if (!submissionTypeMap.has(submissionId)) {
                    submissionTypeMap.set(submissionId, targetType);
                    submissionTargetUserMap.set(submissionId, targetUserId);
                }
            }
        });

        // 3. 통계 계산

        // 평균 좋아요 (전체 참가자 대비)
        const likesPerUser = validParticipants.length > 0
            ? Number((totalLikes / validParticipants.length).toFixed(1))
            : 0;

        // Top Receivers (Top 10)
        const sortedReceivers = Array.from(receiverCounts.entries())
            .sort((a, b) => b[1] - a[1]) // 내림차순
            .slice(0, 10)
            .map(([userId, count]) => ({
                userId,
                userName: participantNameMap.get(userId) || '알 수 없음',
                count
            }));

        let detailedStats = {};

        if (detailed) {
            // Top Givers (Top 10)
            const topGivers = Array.from(giverCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([userId, count]) => ({
                    userId,
                    userName: participantNameMap.get(userId) || '알 수 없음',
                    count
                }));

            // Interaction Pairs (Top 10)
            const interactionPairs = Array.from(pairCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([key, count]) => {
                    const [giverId, receiverId] = key.split('_');
                    return {
                        giverId,
                        giverName: participantNameMap.get(giverId) || '알 수 없음',
                        receiverId,
                        receiverName: participantNameMap.get(receiverId) || '알 수 없음',
                        count
                    };
                });

            // Most Liked Submissions (Split by Type)
            const reviewIds: string[] = [];
            const answerIds: string[] = [];

            // 타입별 ID 분류
            submissionLikeCounts.forEach((count, id) => {
                const type = submissionTypeMap.get(id);
                if (type === 'review') reviewIds.push(id);
                else if (type === 'answer') answerIds.push(id);
            });

            // 각각 정렬 및 Top 10 추출
            const topReviewIds = reviewIds
                .sort((a, b) => (submissionLikeCounts.get(b) || 0) - (submissionLikeCounts.get(a) || 0))
                .slice(0, 10);

            const topAnswerIds = answerIds
                .sort((a, b) => (submissionLikeCounts.get(b) || 0) - (submissionLikeCounts.get(a) || 0))
                .slice(0, 10);

            const allTopIds = [...topReviewIds, ...topAnswerIds];

            type MostLikedSubmission = {
                submissionId: string;
                userId: string;
                userName: string;
                targetType: 'review' | 'answer';
                contentPreview: string; // Keep for compatibility, but we might fetch full content if needed or just use this for list
                fullContent?: string; // Add full content for modal
                dailyQuestion?: string; // 질문 추가
                likeCount: number;
            };

            const mostLikedReviews: MostLikedSubmission[] = [];
            const mostLikedAnswers: MostLikedSubmission[] = [];

            // Batch fetch top submissions to get content (Chunking for > 10 IDs)
            if (allTopIds.length > 0) {
                const subDocs = new Map<string, any>();

                // Firestore 'in' query limit is 10. Split into chunks.
                const chunkSize = 10;
                for (let i = 0; i < allTopIds.length; i += chunkSize) {
                    const chunk = allTopIds.slice(i, i + chunkSize);
                    if (chunk.length === 0) continue;

                    const subSnap = await db.collection(COLLECTIONS.READING_SUBMISSIONS)
                        .where('__name__', 'in', chunk)
                        .get();

                    subSnap.docs.forEach(d => subDocs.set(d.id, d.data()));
                }

                const createSubmissionObj = (subId: string): MostLikedSubmission => {
                    const subData = subDocs.get(subId);
                    const count = submissionLikeCounts.get(subId) || 0;
                    const type = submissionTypeMap.get(subId) || 'review';
                    const userId = submissionTargetUserMap.get(subId) || '';

                    let content = '';
                    let dailyQuestion = '';

                    if (subData) {
                        const data = subData as any;
                        content = type === 'review' ? (data.review || '') : (data.dailyAnswer || '');
                        // 가치관 질문일 경우 질문 내용 가져오기
                        if (type === 'answer') {
                            dailyQuestion = data.dailyQuestion || '';
                        }
                    }

                    return {
                        submissionId: subId,
                        userId,
                        userName: participantNameMap.get(userId) || '알 수 없음',
                        targetType: type,
                        contentPreview: content ? content.slice(0, 50) + (content.length > 50 ? '...' : '') : '(삭제된 글)',
                        fullContent: content, // Full content for modal
                        dailyQuestion: dailyQuestion,
                        likeCount: count
                    };
                };

                topReviewIds.forEach(id => mostLikedReviews.push(createSubmissionObj(id)));
                topAnswerIds.forEach(id => mostLikedAnswers.push(createSubmissionObj(id)));
            }

            detailedStats = {
                topGivers,
                contentTypeStats: contentTypeCounts,
                interactionPairs,
                mostLikedReviews,
                mostLikedAnswers
            };
        }

        const stats: LikesStats = {
            totalLikes,
            todayLikes,
            likesPerUser,
            topReceivers: sortedReceivers,
            ...detailedStats
        };

        return NextResponse.json(stats);

    } catch (error) {
        logger.error('Error fetching like stats:', error);
        return NextResponse.json(
            { error: '좋아요 통계 조회 중 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
