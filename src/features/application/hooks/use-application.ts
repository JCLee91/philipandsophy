'use client';

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { logFunnelEvent, getStepIndex } from '@/lib/firebase/funnel';
import { trackRegistration } from '@/lib/analytics';
import { Question, QUESTIONS, START_QUESTION_ID } from '../constants/questions';

/**
 * 세션 ID 생성 및 관리
 */
const SESSION_STORAGE_KEY = 'pns_funnel_session_id';

function getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return '';

    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
}

interface ApplicationState {
    history: string[]; // Track visited question IDs to support back navigation
    answers: Record<string, unknown>;
    isSubmitting: boolean;
    isComplete: boolean;
    privacyConsent: boolean; // 개인정보처리방침 동의
    trackedSteps: Set<string>; // 이미 트래킹된 단계 (중복 방지)

    // Actions
    setAnswer: (questionId: string, answer: unknown) => void;
    setPrivacyConsent: (consent: boolean) => void;
    nextStep: () => void;
    prevStep: () => void;
    submitForm: () => void;
    resetForm: () => void;
    getCurrentQuestion: () => Question;
    getHistoryLength: () => number;
    canGoBack: () => boolean;
    trackCurrentStep: () => void;
}

export const useApplicationStore = create<ApplicationState>((set, get) => ({
    history: [START_QUESTION_ID],
    answers: {},
    isSubmitting: false,
    isComplete: false,
    privacyConsent: false,
    trackedSteps: new Set<string>(),

    trackCurrentStep: () => {
        const { history, answers, trackedSteps } = get();
        const currentId = history[history.length - 1];

        // 이미 트래킹된 단계는 무시
        if (trackedSteps.has(currentId)) return;

        const sessionId = getOrCreateSessionId();
        if (!sessionId) return;

        // 회원 유형 결정
        const membershipStatus = answers['membership_status'] as string | undefined;
        const memberType: 'new' | 'existing' | null =
            membershipStatus === 'new' ? 'new' :
            membershipStatus === 'existing' ? 'existing' :
            null;

        const stepIndex = getStepIndex(currentId, memberType);

        // 퍼널 이벤트 로깅 (비동기, 실패해도 무시)
        logFunnelEvent({
            sessionId,
            stepId: currentId,
            stepIndex,
            memberType,
        });

        // 트래킹된 단계 기록
        set({ trackedSteps: new Set([...trackedSteps, currentId]) });
    },

    setAnswer: (questionId, answer) => {
        set((state) => ({
            answers: {
                ...state.answers,
                [questionId]: answer,
            },
        }));
    },

    setPrivacyConsent: (consent) => {
        set({ privacyConsent: consent });
    },

    getCurrentQuestion: () => {
        const { history } = get();
        const currentId = history[history.length - 1];
        return QUESTIONS[currentId];
    },

    getHistoryLength: () => {
        return get().history.length;
    },

    canGoBack: () => {
        return get().history.length > 1;
    },

    nextStep: () => {
        const { history, answers, submitForm, trackCurrentStep } = get();
        const currentId = history[history.length - 1];
        const currentQuestion = QUESTIONS[currentId];
        const currentAnswer = answers[currentId];

        // Determine next question ID
        let nextId = currentQuestion.nextQuestionId;

        // Check if selected option has a specific next question (branching)
        if (currentQuestion.type === 'single-select' && currentQuestion.options) {
            const selectedOption = currentQuestion.options.find(opt => opt.value === currentAnswer);
            if (selectedOption?.nextQuestionId) {
                nextId = selectedOption.nextQuestionId;
            }
        }

        if (nextId) {
            set({ history: [...history, nextId] });
            // 다음 단계로 이동 후 트래킹 (setTimeout으로 state 업데이트 후 실행)
            setTimeout(() => trackCurrentStep(), 0);
        } else {
            // No next question, submit form
            submitForm();
        }
    },

    prevStep: () => {
        const { history } = get();
        if (history.length > 1) {
            set({ history: history.slice(0, -1) });
        }
    },

    submitForm: () => {
        const { history, answers, trackedSteps } = get();
        const currentId = history[history.length - 1];
        const currentQuestion = QUESTIONS[currentId];

        set({ isSubmitting: true });

        try {
            // 1. 회원 유형 판별
            const membershipStatus = answers['membership_status'] as string;
            const isNewMember = membershipStatus === 'new';

            // 2. 성별 한글 변환
            const genderMap: Record<string, string> = {
                'male': '남성',
                'female': '여성',
            };
            const gender = answers['gender'] as string;

            // 3. 유입채널 한글 변환
            const channelMap: Record<string, string> = {
                'instagram': '인스타그램',
                'threads': '쓰레드',
                'linkedin': '링크드인',
                'friend': '지인 추천',
                'other': '그 외',
            };
            const channel = answers['channel'] as string;

            // 3. 사진 URL (FileUpload에서 미리 업로드됨)
            const photoUrl = (answers['photoUrl'] as string) || '';

            // 4. 웹훅으로 전송할 데이터 구성
            const webhookData = {
                // 공통 필드
                이름: answers['name'] || '',
                연락처: answers['phone'] || '',
                성별: genderMap[gender] || '',
                회원유형: isNewMember ? '신규' : '기존',
                신청일시: new Date().toISOString(),

                // 신규 멤버 전용 필드
                회사명: answers['company'] || '',
                직군: answers['job_detail'] || '',
                유입채널: channelMap[channel] || channel || '',
                생년월일: answers['birthdate'] || '',
                사진URL: photoUrl,

                // 기존 멤버 전용 필드
                기수: answers['cohort_check'] || '',
            };

            // 5. Make 웹훅으로 전송 (keepalive 옵션으로 페이지 이동해도 전송 보장)
            const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;
            if (webhookUrl) {
                fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(webhookData),
                    keepalive: true, // 페이지 이동/닫힘에도 전송 보장
                }).catch((err) => {
                    // 에러 발생해도 무시 (사용자 경험 방해 X)
                    console.error('웹훅 전송 실패:', err);
                });
            }

            set({ isComplete: true });

            // GTM 전환 이벤트 발생
            if (typeof window !== 'undefined' && window.dataLayer) {
                window.dataLayer.push({
                    event: 'application_complete',
                    member_type: isNewMember ? 'new' : 'existing',
                });
            }

            // Facebook Pixel 전환 이벤트 발생
            trackRegistration('신청서 제출');

            // 제출 완료 퍼널 이벤트 로깅
            const sessionId = getOrCreateSessionId();
            const memberType: 'new' | 'existing' =
                membershipStatus === 'existing' ? 'existing' : 'new';

            if (sessionId && !trackedSteps.has('submit')) {
                logFunnelEvent({
                    sessionId,
                    stepId: 'submit',
                    stepIndex: memberType === 'existing' ? 8 : 11,
                    memberType,
                });
                set({ trackedSteps: new Set([...trackedSteps, 'submit']) });
            }

            // 6. 외부 링크가 있으면 즉시 새 탭으로 열기
            if (currentQuestion.externalLink) {
                window.open(currentQuestion.externalLink, '_blank');
            }
        } catch (error) {
            logger.error('설문 제출 실패', error);
            if (error instanceof Error) {
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            } else {
                console.error('Non-Error thrown:', JSON.stringify(error));
            }
        } finally {
            set({ isSubmitting: false });
        }
    },

    resetForm: () => {
        // 세션 ID 리셋 (새 세션 시작)
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }

        set({
            history: [START_QUESTION_ID],
            answers: {},
            isSubmitting: false,
            isComplete: false,
            privacyConsent: false,
            trackedSteps: new Set<string>(),
        });
    },
}));

// Re-export types and constants for convenience
export type { Question, Option, QuestionType, Field } from '../constants/questions';
export { 
    QUESTIONS, 
    START_QUESTION_ID, 
    COHORT_INFO,
    NEW_MEMBER_TOTAL_STEPS,
    EXISTING_MEMBER_TOTAL_STEPS,
} from '../constants/questions';

