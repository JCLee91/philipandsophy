#!/usr/bin/env tsx
import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';

async function getLongestTexts() {
  const { db } = getFirebaseAdmin();
  
  console.log('\n📊 최장 텍스트 분석 시작...\n');
  
  const submissions = await db.collection('reading_submissions').get();
  
  let longestReview = { len: 0, text: '', book: '', id: '' };
  let longestAnswer = { len: 0, text: '', question: '', id: '' };
  
  submissions.docs.forEach(doc => {
    const d = doc.data();
    
    if (d.review && d.review.length > longestReview.len) {
      longestReview = {
        len: d.review.length,
        text: d.review,
        book: d.bookTitle || '?',
        id: doc.id
      };
    }
    
    if (d.dailyAnswer && d.dailyAnswer.length > longestAnswer.len) {
      longestAnswer = {
        len: d.dailyAnswer.length,
        text: d.dailyAnswer,
        question: d.dailyQuestion || '?',
        id: doc.id
      };
    }
  });
  
  console.log('📚 가장 긴 독서 감상평:');
  console.log(`길이: ${longestReview.len}자`);
  console.log(`책: ${longestReview.book}`);
  console.log(`\n내용:\n${longestReview.text}\n`);
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  console.log('💭 가장 긴 가치관 답변:');
  console.log(`길이: ${longestAnswer.len}자`);
  console.log(`질문: ${longestAnswer.question}`);
  console.log(`\n내용:\n${longestAnswer.text}\n`);
  
  process.exit(0);
}

getLongestTexts().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
