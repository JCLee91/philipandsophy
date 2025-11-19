#!/usr/bin/env tsx
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
const app = initializeApp({
  credential: cert(serviceAccountPath),
  projectId: 'philipandsophy'
});

const db = getFirestore(app, 'seoul');

async function analyze() {
  console.log('📊 3기 데이터 분석 중...\n');
  
  // cohortId가 '3'인 데이터만 필터링
  const snap = await db.collection('reading_submissions')
    .where('cohortId', '==', '3')
    .get();
    
  console.log(`3기 총 ${snap.size}개 문서\n`);
  
  let maxReview = { len: 0, text: '', book: '', id: '', participantId: '' };
  let maxAnswer = { len: 0, text: '', q: '', id: '', participantId: '' };
  
  snap.docs.forEach(doc => {
    const d = doc.data();
    
    if (d.review && d.review.length > maxReview.len) {
      maxReview = { 
        len: d.review.length, 
        text: d.review, 
        book: d.bookTitle || '?', 
        id: doc.id,
        participantId: d.participantId || '?'
      };
    }
    
    if (d.dailyAnswer && d.dailyAnswer.length > maxAnswer.len) {
      maxAnswer = { 
        len: d.dailyAnswer.length, 
        text: d.dailyAnswer, 
        q: d.dailyQuestion || '?', 
        id: doc.id,
        participantId: d.participantId || '?'
      };
    }
  });
  
  console.log('='.repeat(80));
  console.log('📚 3기 - 가장 긴 독서 감상평');
  console.log('='.repeat(80));
  console.log(`길이: ${maxReview.len}자`);
  console.log(`책 제목: ${maxReview.book}`);
  console.log(`작성자 ID: ${maxReview.participantId}`);
  console.log(`\n내용 (간략히 2줄 요약):`);
  
  // 2줄 요약
  if (maxReview.text) {
    const lines = maxReview.text.split('\n').filter(l => l.trim());
    const summary = lines.slice(0, 2).join(' ').substring(0, 200);
    console.log(summary + '...\n');
  }
  
  console.log(`\n전체 내용:\n${maxReview.text}\n`);
  
  console.log('\n' + '='.repeat(80));
  console.log('💭 3기 - 가장 긴 가치관 답변');
  console.log('='.repeat(80));
  console.log(`길이: ${maxAnswer.len}자`);
  console.log(`질문: ${maxAnswer.q}`);
  console.log(`작성자 ID: ${maxAnswer.participantId}`);
  console.log(`\n내용 (간략히 2줄 요약):`);
  
  // 2줄 요약
  if (maxAnswer.text) {
    const lines = maxAnswer.text.split('\n').filter(l => l.trim());
    const summary = lines.slice(0, 2).join(' ').substring(0, 200);
    console.log(summary + '...\n');
  }
  
  console.log(`\n전체 내용:\n${maxAnswer.text}\n`);
  
  console.log('='.repeat(80));
  console.log('✅ 분석 완료\n');
  
  process.exit(0);
}

analyze().catch(err => {
  console.error('❌ 에러:', err);
  process.exit(1);
});
