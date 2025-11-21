import { z } from 'zod';

// ============================================================
// 타입 정의
// ============================================================

/**
 * 참가자 정보 (클러스터링용)
 */
export interface ParticipantForClustering {
    id: string;
    name: string;
    gender?: 'male' | 'female' | 'other';
}

/**
 * 독서 인증 정보 (오늘의 감상평 + 답변)
 */
export interface DailySubmission {
    participantId: string;
    participantName: string;
    gender?: string;
    bookTitle: string;     // ✅ 책 제목 (감상평 맥락 이해용)
    bookAuthor?: string;   // ✅ 저자 (선택)
    review: string;        // ✅ 오늘의 감상평
    dailyQuestion: string; // ✅ 오늘의 질문
    dailyAnswer: string;   // ✅ 오늘의 답변
}

/**
 * 클러스터 정보
 */
export interface Cluster {
    id: string;
    name: string;
    emoji: string;
    theme: string;
    memberIds: string[];
    reasoning: string;
}

/**
 * 클러스터 매칭 결과
 */
export interface ClusterMatchingResult {
    clusters: Record<string, Cluster>;
    assignments: Record<string, {
        assigned: string[];
        clusterId: string;
    }>;
}

/**
 * 클러스터링 전략 타입
 */
export interface ClusteringStrategy {
    mode: 'focused' | 'autonomous';
    focus?: string;
    instruction: string;
}

/**
 * 클러스터 스키마 (Zod)
 */
export const ClusterSchema = z.object({
    id: z.string().describe('클러스터 ID (cluster1, cluster2, ...)'),
    name: z.string().describe('클러스터 이름 (예: "오늘의 사색파")'),
    emoji: z.string().describe('이모지 1개'),
    theme: z.string().describe('오늘의 주제/테마 (AI가 분석한 공통점, 한 문장)'),
    memberIds: z.array(z.string()).describe('클러스터 멤버 ID 배열'),
    reasoning: z.string().describe('AI 분석 근거 (왜 이 사람들을 묶었는지)')
});
