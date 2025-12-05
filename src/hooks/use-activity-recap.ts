'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { parseISO, addDays, differenceInDays } from 'date-fns';
import type { Cohort, ReadingSubmission, DailyMatchingEntry } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

export interface CompanionInfo {
    participantId: string;
    name: string;
    profileImage?: string;
    count: number; // 같은 클러스터 또는 다른 클러스터 횟수
}

export interface ClusterJourneyItem {
    date: string;
    dayNumber: number;
    clusterId: string;
    clusterName: string;
    clusterEmoji: string;
    clusterTheme: string;
    clusterCategory: string;
    clusterReasoning: string;
    memberIds: string[];
}

export interface ActivityRecap {
    // 기본 통계
    certificationRate: number;        // 인증률 (%)
    totalDays: number;                // 총 프로그램 일수
    certifiedDays: number;            // 인증 일수
    avgReviewLength: number;          // 감상평 평균 글자수
    avgDailyAnswerLength: number;     // 가치관 답변 평균 글자수

    // 클러스터 관계
    mostFrequentCompanions: CompanionInfo[];  // 가장 많이 만난 사람 Top 3
    mostDifferentCompanions: CompanionInfo[]; // 가장 달랐던 사람 Top 3
    allCompanions: CompanionInfo[];           // 전체 멤버 (함께한 횟수 순)

    // 나의 클러스터 여정
    myClusterJourney: ClusterJourneyItem[];
}

// ============================================================================
// Hook
// ============================================================================

interface UseActivityRecapOptions {
    participantId: string | undefined;
    cohort: Cohort | undefined;
    allParticipants?: Array<{ id: string; name: string; profileImage?: string }>;
}

export function useActivityRecap({
    participantId,
    cohort,
    allParticipants = [],
}: UseActivityRecapOptions) {

    // 1. 나의 제출 기록 조회
    const { data: mySubmissions = [], isLoading: submissionsLoading } = useQuery<ReadingSubmission[]>({
        queryKey: ['my-submissions-recap', participantId, cohort?.id],
        queryFn: async () => {
            if (!participantId || !cohort?.id) return [];

            const db = getDb();
            const submissionsRef = collection(db, 'reading_submissions');
            const q = query(
                submissionsRef,
                where('participantId', '==', participantId),
                where('cohortId', '==', cohort.id),
                where('status', '==', 'approved')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ReadingSubmission[];
        },
        enabled: !!participantId && !!cohort?.id,
        staleTime: 5 * 60 * 1000, // 5분 캐시
    });

    // 2. Activity Recap 계산
    const activityRecap = useMemo<ActivityRecap | null>(() => {
        if (!cohort || !participantId) return null;

        const dailyFeaturedParticipants = cohort.dailyFeaturedParticipants || {};

        // 프로그램 총 일수 계산 (OT 제외, 인증 가능한 일수)
        const totalDays = cohort.totalDays || 13;
        const certifiedDays = mySubmissions.length;
        const certificationRate = totalDays > 0
            ? Math.round((certifiedDays / totalDays) * 100)
            : 0;

        // 평균 글자수 계산
        const reviews = mySubmissions.map(s => s.review || '').filter(r => r.length > 0);
        const dailyAnswers = mySubmissions.map(s => s.dailyAnswer || '').filter(a => a.length > 0);

        const avgReviewLength = reviews.length > 0
            ? Math.round(reviews.reduce((sum, r) => sum + r.length, 0) / reviews.length)
            : 0;

        const avgDailyAnswerLength = dailyAnswers.length > 0
            ? Math.round(dailyAnswers.reduce((sum, a) => sum + a.length, 0) / dailyAnswers.length)
            : 0;

        // 클러스터 여정 및 동반자 계산
        const myClusterJourney: ClusterJourneyItem[] = [];
        const sameClusterCount: Record<string, number> = {}; // participantId -> count
        const differentClusterCount: Record<string, number> = {}; // participantId -> count

        // 날짜순 정렬
        const sortedDates = Object.keys(dailyFeaturedParticipants).sort();

        // 프로그램 시작일 (모임일 기준 Day 계산용)
        const programStartDate = cohort.startDate ? parseISO(cohort.startDate) : null;

        sortedDates.forEach((date) => {
            const dayData = dailyFeaturedParticipants[date] as DailyMatchingEntry;

            // V3 클러스터 매칭만 처리
            if (dayData.matchingVersion !== 'cluster' || !dayData.clusters) return;

            // 나의 클러스터 찾기
            const myAssignment = dayData.assignments?.[participantId];
            const myClusterId = myAssignment?.clusterId;
            if (!myClusterId) return;

            const myCluster = dayData.clusters[myClusterId];
            if (!myCluster) return;

            // 모임일 = 인증일(date) + 1일
            const matchingDate = parseISO(date);
            const meetingDate = addDays(matchingDate, 1);

            // Day 번호 = 모임일 - 프로그램 시작일 - 1 (OT 제외)
            // startDate가 OT 날짜이므로 1을 빼서 Day 1부터 시작하도록 함
            const dayNumber = programStartDate
                ? differenceInDays(meetingDate, programStartDate) - 1
                : 1;

            // 클러스터 여정에 추가
            myClusterJourney.push({
                date,
                dayNumber,
                clusterId: myClusterId,
                clusterName: myCluster.name,
                clusterEmoji: myCluster.emoji,
                clusterTheme: myCluster.theme,
                clusterCategory: myCluster.category || '',
                clusterReasoning: myCluster.reasoning || '',
                memberIds: myCluster.memberIds || [],
            });

            // 같은 날 다른 참가자들과의 관계 계산
            Object.entries(dayData.assignments || {}).forEach(([otherId, otherAssignment]) => {
                if (otherId === participantId) return;

                const otherClusterId = otherAssignment?.clusterId;
                if (!otherClusterId) return;

                if (otherClusterId === myClusterId) {
                    // 같은 클러스터
                    sameClusterCount[otherId] = (sameClusterCount[otherId] || 0) + 1;
                } else {
                    // 다른 클러스터 (둘 다 인증했지만 다른 그룹)
                    differentClusterCount[otherId] = (differentClusterCount[otherId] || 0) + 1;
                }
            });
        });

        // Top 3 계산
        const participantMap = new Map(allParticipants.map(p => [p.id, p]));

        // 관리자/고스트 제외 (participantMap에 있는 참가자만)
        const mostFrequentCompanions = Object.entries(sameClusterCount)
            .filter(([id]) => participantMap.has(id))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, count]) => {
                const p = participantMap.get(id)!;
                return {
                    participantId: id,
                    name: p.name,
                    profileImage: p.profileImage,
                    count,
                };
            });

        const mostDifferentCompanions = Object.entries(differentClusterCount)
            .filter(([id]) => participantMap.has(id))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, count]) => {
                const p = participantMap.get(id)!;
                return {
                    participantId: id,
                    name: p.name,
                    profileImage: p.profileImage,
                    count,
                };
            });

        // 전체 멤버 (함께한 횟수 순으로 정렬, 나 제외)
        const allCompanions = allParticipants
            .filter(p => p.id !== participantId)
            .map(p => ({
                participantId: p.id,
                name: p.name,
                profileImage: p.profileImage,
                count: sameClusterCount[p.id] || 0,
            }))
            .sort((a, b) => b.count - a.count);

        return {
            certificationRate,
            totalDays,
            certifiedDays,
            avgReviewLength,
            avgDailyAnswerLength,
            mostFrequentCompanions,
            mostDifferentCompanions,
            allCompanions,
            myClusterJourney,
        };
    }, [cohort, participantId, mySubmissions, allParticipants]);

    return {
        activityRecap,
        isLoading: submissionsLoading,
    };
}
