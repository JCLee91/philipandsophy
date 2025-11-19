#!/usr/bin/env tsx
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('🔥 Firebase 초기화 중...');

const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
const app = initializeApp({
  credential: cert(serviceAccountPath),
  projectId: 'philipandsophy'
});

const db = getFirestore(app, 'seoul');

console.log('✅ Firebase 초기화 완료\n');

async function analyze() {
  console.log('📊 데이터 수집 중...\n');
  
  const snap = await db.collection('reading_submissions').get();
  console.log(`총 ${snap.size}개 문서 발견\n`);
  
  let maxReview = { len: 0, text: '', book: '', id: '' };
  let maxAnswer = { len: 0, text: '', q: '', id: '' };
  
  snap.docs.forEach(doc => {
    const d = doc.data();
    
    if (d.review && d.review.length > maxReview.len) {
      maxReview = { len: d.review.length, text: d.review, book: d.bookTitle || '?', id: doc.id };
    }
    
    if (d.dailyAnswer && d.dailyAnswer.length > maxAnswer.len) {
      maxAnswer = { len: d.dailyAnswer.length, text: d.dailyAnswer, q: d.dailyQuestion || '?', id: doc.id };
    }
  });
  
  console.log('=' .repeat(80));
  console.log('📚 가장 긴 독서 감상평');
  console.log('='.repeat(80));
  console.log(`길이: ${maxReview.len}자`);
  console.log(`책 제목: ${maxReview.book}`);
  console.log(`문서 ID: ${maxReview.id}`);
  console.log(`\n내용:\n${maxReview.text}\n`);
  
  console.log('\n' + '='.repeat(80));
  console.log('💭 가장 긴 가치관 답변');
  console.log('='.repeat(80));
  console.log(`길이: ${maxAnswer.len}자`);
  console.log(`질문: ${maxAnswer.q}`);
  console.log(`문서 ID: ${maxAnswer.id}`);
  console.log(`\n내용:\n${maxAnswer.text}\n`);
  
  console.log('='.repeat(80));
  console.log('\n✅ 분석 완료');
  
  process.exit(0);
}

analyze().catch(err => {
  console.error('❌ 에러:', err);
  process.exit(1);
});
