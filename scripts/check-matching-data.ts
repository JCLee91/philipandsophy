/**
 * 매칭 데이터 확인 스크립트
 * - dailyFeaturedParticipants 필드 확인
 * - matching_results 컬렉션 확인
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app, 'seoul');

async function checkMatchingData() {
  try {
    console.log('🔍 매칭 데이터 확인 중...\n');

    // 1. 활성 cohort 조회
    const activeCohortsSnapshot = await db
      .collection('cohorts')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    const cohortId = activeCohortsSnapshot.docs[0]?.id || '3';
    console.log(`📌 Cohort ID: ${cohortId}\n`);

    // 2. dailyFeaturedParticipants 확인
    const cohortDoc = await db.collection('cohorts').doc(cohortId).get();
    const cohortData = cohortDoc.data();
    const dailyFeaturedParticipants = cohortData?.dailyFeaturedParticipants || {};

    console.log('=== dailyFeaturedParticipants ===');
    const dates = Object.keys(dailyFeaturedParticipants).sort().reverse().slice(0, 5);

    if (dates.length === 0) {
      console.log('❌ 데이터 없음\n');
    } else {
      dates.forEach(date => {
        const data = dailyFeaturedParticipants[date];
        console.log(`\n📅 ${date}:`);
        console.log(`   matchingVersion: ${data.matchingVersion || 'N/A'}`);
        console.log(`   assignments 개수: ${Object.keys(data.assignments || {}).length}`);

        // 첫 번째 assignment 샘플 확인
        const firstAssignment = Object.values(data.assignments || {})[0] as any;
        if (firstAssignment) {
          if (Array.isArray(firstAssignment)) {
            console.log(`   타입: Array (AI 매칭)`);
            console.log(`   샘플: [${firstAssignment.slice(0, 2).join(', ')}...]`);
          } else if (firstAssignment.assigned) {
            console.log(`   타입: Object with 'assigned' (랜덤 매칭)`);
            console.log(`   샘플: { assigned: [${firstAssignment.assigned.slice(0, 2).join(', ')}...] }`);
          } else {
            console.log(`   타입: 알 수 없음`);
            console.log(`   샘플:`, JSON.stringify(firstAssignment).substring(0, 100));
          }
        }
      });
    }

    // 3. matching_results 최근 데이터 확인
    console.log('\n\n=== matching_results 컬렉션 ===');
    const matchingResultsSnapshot = await db
      .collection('matching_results')
      .orderBy('confirmedAt', 'desc')
      .limit(5)
      .get();

    if (matchingResultsSnapshot.empty) {
      console.log('❌ 데이터 없음\n');
    } else {
      matchingResultsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`\n📄 ${doc.id}:`);
        console.log(`   cohortId: ${data.cohortId}`);
        console.log(`   date: ${data.date}`);
        console.log(`   confirmedBy: ${data.confirmedBy}`);
        console.log(`   confirmedAt: ${data.confirmedAt?.toDate().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
        console.log(`   matchingVersion: ${data.matching?.matchingVersion || 'N/A'}`);
        console.log(`   assignments 개수: ${Object.keys(data.matching?.assignments || {}).length}`);
      });
    }

    // 4. matching_previews 확인
    console.log('\n\n=== matching_previews 컬렉션 ===');
    const previewsSnapshot = await db
      .collection('matching_previews')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    if (previewsSnapshot.empty) {
      console.log('❌ 데이터 없음 (정상 - 더 이상 사용 안 함)\n');
    } else {
      console.log(`⚠️  ${previewsSnapshot.size}개 문서 발견 (삭제 필요)\n`);
      previewsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   ${doc.id}: status=${data.status}, date=${data.date}`);
      });
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
checkMatchingData()
  .then(() => {
    console.log('\n✅ 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실패:', error);
    process.exit(1);
  });
