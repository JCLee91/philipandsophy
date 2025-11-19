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

async function checkCohorts() {
  console.log('📊 Cohort 목록 확인 중...\n');
  
  const cohorts = await db.collection('cohorts').get();
  
  console.log(`총 ${cohorts.size}개 cohort\n`);
  
  for (const doc of cohorts.docs) {
    const d = doc.data();
    console.log(`- ID: ${doc.id}`);
    console.log(`  이름: ${d.name}`);
    console.log(`  상태: ${d.status}`);
    
    // 각 cohort의 submissions 개수 확인
    const submissions = await db.collection('reading_submissions')
      .where('cohortId', '==', doc.id)
      .get();
    
    console.log(`  제출물: ${submissions.size}개\n`);
  }
  
  process.exit(0);
}

checkCohorts().catch(err => {
  console.error('에러:', err);
  process.exit(1);
});
