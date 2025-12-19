/**
 * 설문 폼 질문 정의
 * 원본 smore 폼과 일치하도록 구성
 */

export type QuestionType = 'single-select' | 'text' | 'date' | 'phone' | 'file' | 'intro' | 'birthdate' | 'composite';

export interface Option {
    label: string;
    value: string;
    nextQuestionId?: string; // For branching logic
}

// Composite 필드 타입 (여러 입력을 한 스텝에서 받을 때 사용)
export interface FieldOption {
    label: string;
    value: string;
}

export interface Field {
    id: string;
    type: 'text' | 'phone' | 'select';
    title?: string; // 필드 메인 제목
    description?: string; // 필드 서브 설명
    label: string; // 인풋 라벨
    placeholder?: string;
    options?: FieldOption[]; // select 타입용
    required?: boolean; // 필드별 필수 여부 (기본 true)
}

export interface Question {
    id: string;
    type: QuestionType;
    title?: string; // composite 타입에서 field.title 사용 시 생략 가능
    description?: string;
    options?: Option[];
    fields?: Field[]; // composite 타입용
    required?: boolean;
    placeholder?: string;
    nextQuestionId?: string; // Default next question if not overridden by option
    buttonText?: string; // For intro pages
    isLastStep?: boolean; // 마지막 단계 여부 (제출 버튼 표시용)
    submitButtonText?: string; // 제출 버튼 텍스트 (기존/신규 멤버에 따라 다름)
    submitDescription?: string; // 제출 버튼 위에 표시할 설명 텍스트
    externalLink?: string; // 제출 후 이동할 외부 링크
    style?: {
        textAlign?: 'left' | 'center' | 'right';
        titleSize?: string; // tailwind class (e.g. 'text-2xl')
        titleColor?: string; // tailwind class (e.g. 'text-white')
        descriptionColor?: string; // tailwind class (e.g. 'text-gray-400')
    };
}

export const START_QUESTION_ID = 'intro';

// 6기 멤버십 일정 (필요시 동적으로 변경 가능하도록 분리)
export const COHORT_INFO = {
    number: 6,
    timeline: [
        { date: '1/3(토) 오후 2시', event: '온라인 OT' },
        { date: '1/4~1/16', event: '2주 독서 프로그램' },
        { date: '1/17(토) 오후 7시', event: '웰컴 파티' },
    ],
};

// Define the questions configuration
export const QUESTIONS: Record<string, Question> = {
    'intro': {
        id: 'intro',
        type: 'intro',
        title: '승인제 소셜클럽\n필립앤소피에 오신 것을 환영합니다.',
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
            { label: '아니요, 신규 멤버입니다.', value: 'new', nextQuestionId: 'personal_info' },
        ],
        required: true,
    },

    // ============================================
    // Branch 1: New Member Flow (신규 멤버)
    // ============================================
    'personal_info': {
        id: 'personal_info',
        type: 'composite',
        title: '만나서 반갑습니다 👋\n먼저 아래 정보를 작성해주세요.',
        fields: [
            { id: 'name', type: 'text', label: '이름', placeholder: '홍길동' },
            { id: 'phone', type: 'phone', label: '연락처', placeholder: '010-0000-0000' },
            {
                id: 'gender', type: 'select', label: '성별', options: [
                    { label: '남성', value: 'male' },
                    { label: '여성', value: 'female' },
                ]
            },
        ],
        required: true,
        nextQuestionId: 'job_info',
    },
    'job_info': {
        id: 'job_info',
        type: 'composite',
        fields: [
            {
                id: 'job_detail',
                type: 'text',
                title: '어떤 일을 하며 일상을 채우고 계신가요?',
                description: '준비 중인 일이 있다면 그걸 적어주셔도 괜찮아요!',
                label: '직업/하는 일',
                placeholder: '예) 삼성전자 인사팀에서 조직문화 기획하고 있어요.',
            },
            {
                id: 'culture_interest',
                type: 'text',
                title: '(선택) 멤버들과 함께 하고싶은 취미나 문화생활이 있나요?',
                description: '책, 영화, 전시, 공연, 미식 등 무엇이든 좋아요.',
                label: '문화생활',
                placeholder: '같이 뮤지컬 보고 얘기 나누면 재밌을 것 같아요 ㅎㅎ!',
                required: false,
            },
        ],
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
        title: '프로그램에서 사용될\n본인 사진 한 장을 첨부해주세요.',
        description: '남이 찍어준 자연스러운 사진도 괜찮아요.',
        required: true,
        nextQuestionId: 'birthdate',
    },
    'birthdate': {
        id: 'birthdate',
        type: 'birthdate',
        title: '생년월일 8자리를 입력해주세요.',
        description: '미성년자는 참여할 수 없어요.',
        placeholder: 'ex. 19950101 / 20020202',
        required: true,
        isLastStep: true,
        submitDescription: '간단한 8분 인터뷰가 끝나면\n멤버들과 함께 문화생활을 즐길 수 있어요!',
        submitButtonText: '인터뷰 예약하기',
        externalLink: 'https://whattime.co.kr/philipandsophy/10minute_interviews',
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
        nextQuestionId: 'personal_info_existing',
    },
    'personal_info_existing': {
        id: 'personal_info_existing',
        type: 'composite',
        title: '다시 만나게 되어 반가워요 👋\n아래 정보를 작성해주시면 바로 연락드릴게요!',
        fields: [
            { id: 'name', type: 'text', label: '이름', placeholder: '홍길동' },
            { id: 'phone', type: 'phone', label: '연락처', placeholder: '010-0000-0000' },
        ],
        required: true,
        isLastStep: true,
        submitButtonText: '재참가 신청 완료',
        // End of Existing Member flow
    },
};

/**
 * 총 질문 수 계산 (브랜칭에 따라 다름)
 */
export const NEW_MEMBER_TOTAL_STEPS = 7; // intro -> membership_status -> personal_info -> job_info -> channel -> photo -> birthdate
export const EXISTING_MEMBER_TOTAL_STEPS = 4; // intro -> membership_status -> cohort_check -> personal_info_existing
