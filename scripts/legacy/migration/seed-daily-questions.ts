#!/usr/bin/env tsx
/**
 * Daily Questions 시딩 스크립트
 *
 * 사용법:
 * npm run seed:questions
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';
import { format, addDays, parseISO } from 'date-fns';
import { Timestamp } from 'firebase-admin/firestore';

const db = getAdminDb();

// 14일치 질문 데이터 (constants/daily-questions.ts와 동일)
const DAILY_QUESTIONS = [
  { category: '생활 패턴', question: '일상에서 가장 즐거움이나 몰입감을 느끼는 순간은 언제인가요?' },
  { category: '가치관 & 삶', question: '현재의 직업을 선택한 이유와 이 직업이 주는 매력은 무엇인가요?' },
  { category: '성향', question: '나만의 인간관계 손절 포인트를 알려주세요.' },
  { category: '생활 패턴', question: '에너지가 방전됐을 때, 가장 효과적인 충전 방식은 무엇인가요?' },
  { category: '연애 스타일', question: '마음을 표현할 때, 어떤 방식이 가장 진심을 드러낼 수 있다고 생각하나요?' },
  { category: '성향', question: '가장 편안함을 느끼는 사람들의 유형은 어떤 모습인가요?' },
  { category: '꿈꾸는 미래', question: '시간이 지나도 변하지 않기를 바라는 나의 모습은 무엇인가요?' },
  { category: '성향', question: '나만의 내적/외적 매력 각 1가지씩 알려주세요.' },
  { category: '연애 스타일', question: '연애상대방이 나에 대해 꼭 알아야 할 한가지가 있다면?' },
  { category: '생활 패턴', question: '남들이 안 해봤을 법한, 나만의 특별한 경험이 있다면?' },
  { category: '꿈꾸는 미래', question: '책이나 영화를 보면서 살아보고 싶은 삶이 있었나요?' },
  { category: '가치관 & 삶', question: '최근에 배우거나 깨달은 것 중 가장 인상 깊었던 건 무엇인가요?' },
  { category: '생활 패턴', question: '생활 리듬이 상대방과 다를 경우, 가장 배려받고 싶은 부분은 무엇인가요?' },
  { category: '가치관 & 삶', question: '차 한 대, 소파 하나, 신발 한 켤레에 쓸 수 있는 최대 금액은?' },
];

async function seedDailyQuestions() {
  try {
    console.log('📚 Daily Questions 시딩 시작...\n');

    // 기수별로 질문 추가
    const cohorts = [
      { id: '1', name: '1기', programStartDate: '2025-10-11' },
      { id: '2', name: '2기', programStartDate: '2025-10-25' },
    ];

    for (const cohort of cohorts) {
      console.log(`\n[${cohort.name}] 질문 추가 중...`);

      const startDate = parseISO(cohort.programStartDate);

      // 14일치 질문 추가
      for (let i = 0; i < DAILY_QUESTIONS.length; i++) {
        const dayNumber = i + 1;
        const date = format(addDays(startDate, i), 'yyyy-MM-dd');
        const question = DAILY_QUESTIONS[i];

        const questionData = {
          dayNumber,
          date,
          category: question.category,
          question: question.question,
          order: dayNumber,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // Firebase에 저장
        await db
          .collection('cohorts')
          .doc(cohort.id)
          .collection('daily_questions')
          .doc(dayNumber.toString())
          .set(questionData);

        console.log(`  ✅ Day ${dayNumber} (${date}): ${question.question.substring(0, 30)}...`);
      }
    }

    console.log('\n✨ Daily Questions 시딩 완료!');
    console.log('\n📋 추가된 데이터:');
    console.log('- 1기: 14개 질문 (2025-10-11 ~ 2025-10-24)');
    console.log('- 2기: 14개 질문 (2025-10-25 ~ 2025-11-07)');

    process.exit(0);
  } catch (error) {
    console.error('❌ 시딩 중 오류 발생:', error);
    process.exit(1);
  }
}

// 실행
seedDailyQuestions();