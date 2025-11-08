/**
 * 3기 Daily Questions 추가
 *
 * 실행 방법:
 * npm run add:cohort3-questions
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { addDays, format, parseISO } from 'date-fns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

const COHORT_ID = '3';

// 3기 Daily Questions
const questions = [
  {
    category: '심리 & 감정',
    question: '스트레스가 심할 때, 내가 찾게 되는 "나만의 안전지대"는 어떤 건가요?',
  },
  {
    category: '가치관 & 삶',
    question: '인생에서 "성공"의 기준은 어떻게 정의하고 있나요?',
  },
  {
    category: '가치관 & 삶',
    question: '지금의 나를 만든 결정적인 선택 한 가지가 있다면?',
  },
  {
    category: '목표 & 계획',
    question: '언젠가 꼭 이뤄보고 싶은 단 하나의 버킷리스트가 있다면?',
  },
  {
    category: '가치관 & 삶',
    question: '무언가를 \'그만두기\'로 한 경험 중 가장 기억나는 게 있다면?',
  },
  {
    category: '자기 인식',
    question: '스스로 보완하고 싶다고 느끼는 약점은 무엇인가요?',
  },
  {
    category: '관계 & 소통',
    question: '특히 인연을 오래 이어가고 싶은 사람은 당신에게 어떤 사람인가요?',
  },
  {
    category: '관계 & 소통',
    question: '10년 전의 나와 지금의 나, 인간관계에 있어 어떤 점이 가장 크게 다른 것 같나요?',
  },
  {
    category: '생활 패턴',
    question: '휴일에 아무런 약속이 없다면, 당신은 무엇을 하며 하루를 보낼 것 같나요?',
  },
  {
    category: '가치관 & 삶',
    question: '미래에 당신에게 대학생인 자녀가 있다면, 그 자녀에게 용돈을 얼마나 주실 건가요?',
  },
  {
    category: '일 & 커리어',
    question: '만약 당신이 이제 막 경제적 자유를 얻었다면, 몇 살 까지 일하고 싶은가요?',
  },
  {
    category: '여행 & 취향',
    question: '만약 당신에게 예고 없이 10일의 휴가가 주어진다면, 어디로 여행을 떠나고 싶은가요?',
  },
  {
    category: '관계 & 소통',
    question: '누군가를 진심으로 신뢰하게 되는 결정적인 순간은 언제인가요?',
  },
  {
    category: '독서 & 성장',
    question: '최근 읽은 책 중 당신의 생각을 바꾼 한 문장이 있다면?',
  },
];

async function addDailyQuestions() {
  console.log('📝 3기 Daily Questions 추가 시작...\n');

  try {
    // 1. 3기 cohort 정보 조회
    console.log('📖 1. 3기 cohort 정보 조회...');
    const cohortRef = db.collection('cohorts').doc(COHORT_ID);
    const cohortSnap = await cohortRef.get();

    if (!cohortSnap.exists) {
      console.error(`❌ Cohort ${COHORT_ID} not found`);
      return;
    }

    const cohortData = cohortSnap.data();
    const startDate = parseISO(cohortData?.programStartDate || cohortData?.startDate);
    console.log(`✅ 3기 시작일: ${format(startDate, 'yyyy-MM-dd')}\n`);

    // 2. Daily Questions 생성
    console.log('📝 2. Daily Questions 생성 중...');

    const dailyQuestionsRef = cohortRef.collection('daily_questions');

    for (let i = 0; i < questions.length; i++) {
      const dayNumber = i + 1;
      const date = format(addDays(startDate, i), 'yyyy-MM-dd');
      const questionData = questions[i];

      const docData = {
        dayNumber,
        date,
        category: questionData.category,
        question: questionData.question,
        order: dayNumber,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await dailyQuestionsRef.doc(dayNumber.toString()).set(docData);

      console.log(`✅ Day ${dayNumber} (${date}): ${questionData.question}`);
    }

    console.log(`\n✅ ${questions.length}개의 질문 추가 완료!`);

    // 3. 검증
    console.log('\n🔍 3. 검증 중...');
    const verifySnapshot = await dailyQuestionsRef.get();
    console.log(`   저장된 질문 수: ${verifySnapshot.size}개`);

    console.log('\n🎉 Daily Questions 추가 완료!');
  } catch (error) {
    console.error('\n❌ 에러 발생:', error);
    throw error;
  }
}

addDailyQuestions();
