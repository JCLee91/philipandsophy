/**
 * 설문 폼 질문 정의
 * 원본 smore 폼과 일치하도록 구성
 */

export type QuestionType = 'single-select' | 'text' | 'date' | 'phone' | 'file' | 'intro' | 'birthdate';

export interface Option {
    label: string;
    value: string;
    nextQuestionId?: string; // For branching logic
}

export interface Question {
    id: string;
    type: QuestionType;
    title: string;
    description?: string;
    options?: Option[];
    required?: boolean;
    placeholder?: string;
    nextQuestionId?: string; // Default next question if not overridden by option
    buttonText?: string; // For intro pages
    isLastStep?: boolean; // 마지막 단계 여부 (제출 버튼 표시용)
    submitButtonText?: string; // 제출 버튼 텍스트 (기존/신규 멤버에 따라 다름)
    style?: {
        textAlign?: 'left' | 'center' | 'right';
        titleSize?: string; // tailwind class (e.g. 'text-2xl')
        titleColor?: string; // tailwind class (e.g. 'text-white')
        descriptionColor?: string; // tailwind class (e.g. 'text-gray-400')
    };
}

export const START_QUESTION_ID = 'intro';

// 5기 멤버십 일정 (필요시 동적으로 변경 가능하도록 분리)
export const COHORT_INFO = {
    number: 5,
    timeline: [
        { date: '12/6 오후 2시', event: '온라인 오리엔테이션' },
        { date: '12/7~12/20', event: '온라인 독서프로그램' },
        { date: '12/21 저녁 6시', event: '클로징 파티(서울)' },
    ],
};

// Define the questions configuration
export const QUESTIONS: Record<string, Question> = {
    'intro': {
        id: 'intro',
        type: 'intro',
        title: '승인제 독서소셜클럽\n필립앤소피에 오신 것을 환영합니다.',
        description: `${COHORT_INFO.number}기 멤버십 타임라인은 다음과 같습니다.\n📍 ${COHORT_INFO.timeline[0].date}: ${COHORT_INFO.timeline[0].event}\n📍 ${COHORT_INFO.timeline[1].date} : ${COHORT_INFO.timeline[1].event}\n📍 ${COHORT_INFO.timeline[2].date}: ${COHORT_INFO.timeline[2].event}\n\n위 일정에 참여 가능하시면\n"다음" 을 눌러주세요.`,
        buttonText: '다음',
        nextQuestionId: 'membership_status',
        style: {
            textAlign: 'left',
            titleSize: 'text-xl md:text-2xl',
        }
    },
    'membership_status': {
        id: 'membership_status',
        type: 'single-select',
        title: '필립앤소피 프로그램을\n진행한 적이 있으신가요?',
        options: [
            { label: '예, 재참여하려고 합니다.', value: 'existing', nextQuestionId: 'cohort_check' },
            { label: '아니요, 신규 멤버입니다.', value: 'new', nextQuestionId: 'name' },
        ],
        required: true,
    },

    // ============================================
    // Branch 1: New Member Flow (신규 멤버)
    // ============================================
    'name': {
        id: 'name',
        type: 'text',
        title: '당신의 실명을 기입해주세요.',
        placeholder: '홍길동',
        required: true,
        nextQuestionId: 'phone',
    },
    'phone': {
        id: 'phone',
        type: 'phone',
        title: '연락처를 기입해 주세요.',
        placeholder: 'ex. 010-1234-5678',
        required: true,
        nextQuestionId: 'job_details',
    },
    'job_details': {
        id: 'job_details',
        type: 'text',
        title: '현재 회사명과 하시는 일을 적어 주세요.',
        description: '해당 없으신 분은 "해당 없음"으로 적어주세요.',
        placeholder: 'ex. ##전자 / 마케팅',
        required: true,
        nextQuestionId: 'channel',
    },
    'channel': {
        id: 'channel',
        type: 'single-select',
        title: '필립앤소피를 어떻게 알고 신청하셨나요?',
        options: [
            { label: '인스타그램', value: 'instagram' },
            { label: '쓰레드', value: 'threads' },
            { label: '링크드인', value: 'linkedin' },
            { label: '지인 추천', value: 'friend' },
            { label: '그 외', value: 'other' },
        ],
        required: true,
        nextQuestionId: 'photo',
    },
    'photo': {
        id: 'photo',
        type: 'file',
        title: '본인 확인을 위해,\n자신의 매력을 잘 드러낼 수 있는\n사진 한 장을 첨부해주세요.',
        description: '(남이 찍어준 사진도 괜찮아요)',
        required: true,
        nextQuestionId: 'birthdate',
    },
    'birthdate': {
        id: 'birthdate',
        type: 'birthdate',
        title: '나이(생년월일 8자리)를 입력해 주세요.',
        description: '*미성년자는 참여할 수 없습니다.',
        placeholder: 'ex. 19950101 / 20020202',
        required: true,
        isLastStep: true,
        submitButtonText: '인터뷰 예약하기',
        // End of New Member flow
    },

    // ============================================
    // Branch 2: Existing Member Flow (기존 멤버)
    // ============================================
    'cohort_check': {
        id: 'cohort_check',
        type: 'text',
        title: '2주간 활동하셨던\n프로그램 기수를 입력해주세요.',
        placeholder: '예시: 1기',
        required: true,
        nextQuestionId: 'phone_existing',
    },
    'phone_existing': {
        id: 'phone_existing',
        type: 'phone',
        title: '연락처를 기입해 주세요.',
        placeholder: 'ex. 010-1234-5678',
        required: true,
        isLastStep: true,
        submitButtonText: '인터뷰 없이 신청 완료',
        // End of Existing Member flow
    },
};

/**
 * 총 질문 수 계산 (브랜칭에 따라 다름)
 */
export const NEW_MEMBER_TOTAL_STEPS = 8; // intro -> membership_status -> name -> phone -> job_details -> channel -> photo -> birthdate
export const EXISTING_MEMBER_TOTAL_STEPS = 4; // intro -> membership_status -> cohort_check -> phone_existing
