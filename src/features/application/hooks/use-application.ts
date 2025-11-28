'use client';

import { create } from 'zustand';
import { Question, QUESTIONS, START_QUESTION_ID } from '../constants/questions';

interface ApplicationState {
    history: string[]; // Track visited question IDs to support back navigation
    answers: Record<string, unknown>;
    isSubmitting: boolean;
    isComplete: boolean;
    privacyConsent: boolean; // 개인정보처리방침 동의

    // Actions
    setAnswer: (questionId: string, answer: unknown) => void;
    setPrivacyConsent: (consent: boolean) => void;
    nextStep: () => void;
    prevStep: () => void;
    submitForm: () => Promise<void>;
    resetForm: () => void;
    getCurrentQuestion: () => Question;
    getHistoryLength: () => number;
    canGoBack: () => boolean;
}

export const useApplicationStore = create<ApplicationState>((set, get) => ({
    history: [START_QUESTION_ID],
    answers: {},
    isSubmitting: false,
    isComplete: false,
    privacyConsent: false,

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
        const { history, answers, submitForm } = get();
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

    submitForm: async () => {
        set({ isSubmitting: true });
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            set({ isComplete: true });
        } catch (error) {
            console.error('Submission failed', error);
        } finally {
            set({ isSubmitting: false });
        }
    },

    resetForm: () => {
        set({
            history: [START_QUESTION_ID],
            answers: {},
            isSubmitting: false,
            isComplete: false,
            privacyConsent: false,
        });
    },
}));

// Re-export types and constants for convenience
export type { Question, Option, QuestionType } from '../constants/questions';
export { 
    QUESTIONS, 
    START_QUESTION_ID, 
    COHORT_INFO,
    NEW_MEMBER_TOTAL_STEPS,
    EXISTING_MEMBER_TOTAL_STEPS,
} from '../constants/questions';

