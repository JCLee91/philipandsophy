/**
 * Daily Questions for Reading Submissions
 * These are constants that don't need to be in the database
 */

const DAILY_QUESTIONS = [
  '오늘 읽은 부분에서 가장 기억에 남는 문장이나 장면은 무엇인가요?',
  '책 속 인물 중 가장 인상 깊었던 인물은 누구이며, 그 이유는 무엇인가요?',
  '오늘 읽은 내용이 현재 나의 삶과 연결되는 부분이 있나요?',
  '저자가 전달하고자 하는 핵심 메시지가 무엇이라고 생각하나요?',
  '오늘 독서를 하면서 떠오른 질문이나 궁금증이 있나요?',
  '책을 읽으며 새롭게 알게 된 지식이나 통찰이 있나요?',
  '책 속의 상황이 나라면 어떻게 행동했을 것 같나요?',
  '오늘 읽은 부분을 한 문장으로 요약한다면?',
  '이 책을 읽기 전과 후, 생각이 바뀐 부분이 있나요?',
  '오늘 독서가 나에게 어떤 영향을 주었나요?',
];

/**
 * Get a random daily question
 */
export function getDailyQuestion(): string {
  const randomIndex = Math.floor(Math.random() * DAILY_QUESTIONS.length);
  return DAILY_QUESTIONS[randomIndex];
}
