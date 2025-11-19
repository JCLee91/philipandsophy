#!/usr/bin/env tsx
/**
 * 최장 독서 감상평 및 가치관 답변 분석
 */

import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';

async function analyzeLongestContent() {
  try {
    console.log('\n🔍 최장 콘텐츠 분석\n');
    console.log('='.repeat(80));

    const { db } = getFirebaseAdmin();

    // 1. 최장 독서 감상평 분석
    console.log('\n📖 독서 감상평 분석 중...\n');
    const submissionsSnap = await db.collection('reading_submissions').get();
    
    let longestReview = { length: 0, content: '', bookTitle: '', participantId: '' };
    
    submissionsSnap.forEach(doc => {
      const data = doc.data();
      const review = data.review || '';
      if (review.length > longestReview.length) {
        longestReview = {
          length: review.length,
          content: review,
          bookTitle: data.bookTitle || '제목 없음',
          participantId: data.participantId || 'unknown'
        };
      }
    });

    console.log('📚 가장 긴 독서 감상평:');
    console.log(`길이: ${longestReview.length}자`);
    console.log(`책 제목: ${longestReview.bookTitle}`);
    console.log(`작성자: ${longestReview.participantId}`);
    console.log(`\n내용:\n${longestReview.content}\n`);

    // 2. 최장 가치관 답변 분석 (dailyAnswer 필드 확인)
    console.log('\n💭 가치관 답변 분석 중...\n');
    
    let longestAnswer = { length: 0, content: '', question: '', participantId: '' };
    
    submissionsSnap.forEach(doc => {
      const data = doc.data();
      const answer = data.dailyAnswer || '';
      if (answer.length > longestAnswer.length) {
        longestAnswer = {
          length: answer.length,
          content: answer,
          question: data.dailyQuestion || '질문 없음',
          participantId: data.participantId || 'unknown'
        };
      }
    });

    console.log('💡 가장 긴 가치관 답변:');
    console.log(`길이: ${longestAnswer.length}자`);
    console.log(`질문: ${longestAnswer.question}`);
    console.log(`작성자: ${longestAnswer.participantId}`);
    console.log(`\n내용:\n${longestAnswer.content}\n`);

    console.log('='.repeat(80));
    console.log('\n✅ 분석 완료\n');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error);
    throw error;
  }
}

analyzeLongestContent()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
