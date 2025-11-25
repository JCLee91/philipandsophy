/**
 * 클러스터 매칭 초기화 및 재실행 스크립트
 *
 * 1. 기존 매칭 데이터 삭제
 * 2. Gemini 3 Pro로 새 매칭 실행
 * 3. 결과를 DB에 저장
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
db.settings({ databaseId: 'seoul' });

const FUNCTION_URL = 'https://manualclustermatching-vliq2xsjqa-du.a.run.app';
const INTERNAL_SECRET = 'vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=';

async function deleteMatchingData(cohortId, date) {
  console.log(`\n🗑️  [${cohortId}] ${date} 매칭 데이터 삭제 중...`);

  // 1. matching_results 문서 삭제
  const matchingResultRef = db.collection('matching_results').doc(`${cohortId}-${date}`);
  const matchingDoc = await matchingResultRef.get();
  if (matchingDoc.exists) {
    await matchingResultRef.delete();
    console.log(`   ✅ matching_results/${cohortId}-${date} 삭제 완료`);
  } else {
    console.log(`   ⚠️ matching_results/${cohortId}-${date} 없음 (skip)`);
  }

  // 2. cohorts 문서의 dailyFeaturedParticipants[date] 삭제
  const cohortRef = db.collection('cohorts').doc(cohortId);
  const cohortDoc = await cohortRef.get();

  if (cohortDoc.exists) {
    const data = cohortDoc.data();
    const dailyFeaturedParticipants = data?.dailyFeaturedParticipants || {};

    if (dailyFeaturedParticipants[date]) {
      delete dailyFeaturedParticipants[date];
      await cohortRef.update({
        dailyFeaturedParticipants,
        updatedAt: admin.firestore.Timestamp.now()
      });
      console.log(`   ✅ cohorts/${cohortId}/dailyFeaturedParticipants[${date}] 삭제 완료`);
    } else {
      console.log(`   ⚠️ cohorts/${cohortId}/dailyFeaturedParticipants[${date}] 없음 (skip)`);
    }
  }
}

async function runMatching(cohortId, date) {
  console.log(`\n🔄 [${cohortId}] ${date} 새 매칭 실행 중... (Gemini 3 Pro)`);

  const startTime = Date.now();

  // AbortController for timeout (3분)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  const response = await fetch(FUNCTION_URL, {
    signal: controller.signal,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET
    },
    body: JSON.stringify({ cohortId, date })
  });

  clearTimeout(timeoutId);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (!response.ok) {
    const error = await response.json();
    console.error(`   ❌ 매칭 실패 (${elapsed}초):`, error.message);
    return null;
  }

  const result = await response.json();
  console.log(`   ✅ 매칭 성공 (${elapsed}초): ${result.totalParticipants}명 → ${Object.keys(result.matching.clusters).length}개 클러스터`);

  return result;
}

async function saveMatchingResult(cohortId, date, result) {
  console.log(`\n💾 [${cohortId}] ${date} 결과 저장 중...`);

  const matchingEntry = {
    clusters: result.matching.clusters,
    assignments: result.matching.assignments,
    matchingVersion: 'cluster'
  };

  // 1. cohorts 문서에 저장
  const cohortRef = db.collection('cohorts').doc(cohortId);
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(cohortRef);
    if (!doc.exists) throw new Error(`Cohort ${cohortId} not found`);

    const data = doc.data();
    const dailyFeaturedParticipants = data?.dailyFeaturedParticipants || {};
    dailyFeaturedParticipants[date] = matchingEntry;

    transaction.update(cohortRef, {
      dailyFeaturedParticipants,
      updatedAt: admin.firestore.Timestamp.now()
    });
  });
  console.log(`   ✅ cohorts/${cohortId}/dailyFeaturedParticipants[${date}] 저장 완료`);

  // 2. matching_results에 백업 저장
  const confirmRef = db.collection('matching_results').doc(`${cohortId}-${date}`);
  await confirmRef.set({
    cohortId,
    date,
    matching: matchingEntry,
    totalParticipants: result.totalParticipants,
    clusterCount: Object.keys(result.matching.clusters).length,
    confirmedAt: admin.firestore.Timestamp.now(),
    confirmedBy: 'reset_and_rematch_script'
  });
  console.log(`   ✅ matching_results/${cohortId}-${date} 저장 완료`);
}

async function analyzeGenderBalance(cohortId, result) {
  // 참가자 성별 정보 조회
  const snapshot = await db.collection('participants')
    .where('cohortId', '==', cohortId)
    .get();

  const genderMap = new Map();
  snapshot.forEach(doc => {
    genderMap.set(doc.id, doc.data().gender);
  });

  console.log(`\n📊 [${cohortId}] 성비 분석:`);

  let hasSingleGender = false;

  for (const [clusterId, cluster] of Object.entries(result.matching.clusters)) {
    let male = 0, female = 0;
    for (const memberId of cluster.memberIds) {
      const gender = genderMap.get(memberId);
      if (gender === 'male') male++;
      else if (gender === 'female') female++;
    }

    const total = cluster.memberIds.length;
    let status = '';
    if (male === 0 && female > 0) { status = '❌ 여성만'; hasSingleGender = true; }
    else if (female === 0 && male > 0) { status = '❌ 남성만'; hasSingleGender = true; }
    else if (Math.abs(male - female) <= 1) status = '✅ 균형';
    else if (Math.abs(male - female) <= 2) status = '🔶 양호';
    else status = '⚠️ 불균형';

    console.log(`   ${cluster.emoji || '📌'} ${cluster.name}: ${total}명 (남${male} 여${female}) ${status}`);
  }

  return !hasSingleGender;
}

async function main() {
  const cohorts = ['4-1', '4-2'];
  const date = '2025-11-25';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 클러스터 매칭 초기화 및 재실행`);
  console.log(`   대상: ${cohorts.join(', ')}`);
  console.log(`   날짜: ${date}`);
  console.log(`   모델: Gemini 3 Pro (thinkingLevel: high)`);
  console.log(`${'='.repeat(60)}`);

  for (const cohortId of cohorts) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📦 코호트 ${cohortId} 처리 시작`);
    console.log(`${'─'.repeat(60)}`);

    // 1. 삭제
    await deleteMatchingData(cohortId, date);

    // 2. 새 매칭 실행
    const result = await runMatching(cohortId, date);

    if (!result) {
      console.log(`\n⚠️ [${cohortId}] 매칭 실패, 다음 코호트로 이동`);
      continue;
    }

    // 3. 성비 분석
    const isBalanced = await analyzeGenderBalance(cohortId, result);

    if (!isBalanced) {
      console.log(`\n⚠️ [${cohortId}] 단일 성별 클러스터 발견! 저장하지 않음`);
      continue;
    }

    // 4. 저장
    await saveMatchingResult(cohortId, date, result);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ 모든 작업 완료`);
  console.log(`${'='.repeat(60)}\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
