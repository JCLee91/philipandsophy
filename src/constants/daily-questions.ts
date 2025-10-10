/**
 * Daily Questions for Reading Submissions
 * These are constants that don't need to be in the database
 */

export type QuestionCategory = '성향' | '생활 패턴' | '연애 스타일' | '꿈꾸는 미래' | '가치관 & 삶';

export interface DailyQuestion {
  category: QuestionCategory;
  question: string;
}

/**
 * 14일간 날짜별로 랜덤 섞인 질문 순서
 * 10월 11일부터 10월 24일까지 각 질문이 정확히 1번씩 나옵니다.
 */
const DAILY_QUESTIONS_SCHEDULE: DailyQuestion[] = [
  // Day 1 (10월 11일)
  { category: '생활 패턴', question: '남들이 안 해봤을 법한, 나만의 특별한 경험이 있다면?' },
  // Day 2 (10월 12일)
  { category: '꿈꾸는 미래', question: '시간이 지나도 변하지 않기를 바라는 나의 모습은 무엇인가요?' },
  // Day 3 (10월 13일)
  { category: '성향', question: '나만의 인간관계 손절 포인트를 알려주세요.' },
  // Day 4 (10월 14일)
  { category: '연애 스타일', question: '마음을 표현할 때, 어떤 방식이 가장 진심을 드러낼 수 있다고 생각하나요?' },
  // Day 5 (10월 15일)
  { category: '가치관 & 삶', question: '최근에 배우거나 깨달은 것 중 가장 인상 깊었던 건 무엇인가요?' },
  // Day 6 (10월 16일)
  { category: '생활 패턴', question: '에너지가 방전됐을 때, 가장 효과적인 충전 방식은 무엇인가요?' },
  // Day 7 (10월 17일)
  { category: '성향', question: '가장 편안함을 느끼는 사람들의 유형은 어떤 모습인가요?' },
  // Day 8 (10월 18일)
  { category: '가치관 & 삶', question: '차 한 대, 소파 하나, 신발 한 컬렉션에 쓸 수 있는 최대 금액은?' },
  // Day 9 (10월 19일)
  { category: '생활 패턴', question: '일상에서 가장 즐거움이나 몰입감을 느끼는 순간은 언제인가요?' },
  // Day 10 (10월 20일)
  { category: '연애 스타일', question: '연애상대방이 나에 대해 꼭 알아야 할 한 가지가 있다면?' },
  // Day 11 (10월 21일)
  { category: '꿈꾸는 미래', question: '책이나 영화를 보면서 살아보고 싶은 삶이 있었나요?' },
  // Day 12 (10월 22일)
  { category: '생활 패턴', question: '생활 리듬이 상대방과 다를 경우, 가장 배려받고 싶은 부분은 무엇인가요?' },
  // Day 13 (10월 23일)
  { category: '성향', question: '나만의 내적/외적 매력 각 1가지씩 알려주세요.' },
  // Day 14 (10월 24일)
  { category: '가치관 & 삶', question: '현재의 직업을 선택한 이유와 이 직업이 주는 매력은 무엇인가요?' },
];

// 프로그램 시작 날짜 (2025년 10월 11일)
const PROGRAM_START_DATE = new Date(2025, 9, 11); // 월은 0부터 시작

/**
 * Get a daily question based on current date
 * 10월 11일부터 14일간 각 질문이 정확히 1번씩 나옵니다.
 * 
 * - 10월 11일: 1번째 질문
 * - 10월 12일: 2번째 질문
 * - ...
 * - 10월 24일: 14번째 질문
 */
export function getDailyQuestion(): DailyQuestion {
  const today = new Date();
  
  // 프로그램 시작일로부터 경과한 일수 계산
  const daysSinceStart = Math.floor(
    (today.getTime() - PROGRAM_START_DATE.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // 0~13일차: 해당 인덱스의 질문 반환
  // 14일차 이후: 순환 (14로 나눈 나머지)
  const questionIndex = daysSinceStart % DAILY_QUESTIONS_SCHEDULE.length;
  
  return DAILY_QUESTIONS_SCHEDULE[questionIndex];
}

/**
 * Get only the question text (for backward compatibility)
 */
export function getDailyQuestionText(): string {
  return getDailyQuestion().question;
}
