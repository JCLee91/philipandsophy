/**
 * 랜덤 매칭 스크립트
 *
 * AI 분석 없이 참가자들을 완전 랜덤으로 매칭하여 DB에 저장합니다.
 * 오늘의 서재에 바로 반영됩니다.
 */

// 환경 변수 로드 (최상단에서 실행)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';
import { getTodayString, getYesterdayString } from '@/lib/date-utils';
import { getDailyQuestionText } from '@/constants/daily-questions';

const db = getAdminDb();

// 🔧 설정: cohortId를 여기에 입력하세요
const COHORT_ID = '1'; // cohort ID

// 랜덤 셔플 함수
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 배열에서 랜덤으로 N개 선택 (중복 없음)
function pickRandom<T>(array: T[], count: number, exclude: T[] = []): T[] {
  const available = array.filter(item => !exclude.includes(item));
  const shuffled = shuffle(available);
  return shuffled.slice(0, Math.min(count, available.length));
}

async function randomMatching() {
  const todayDate = getTodayString();
  const yesterdayDate = getYesterdayString();
  const question = getDailyQuestionText(yesterdayDate);

  console.log('\n🎲 랜덤 매칭 시작\n');
  console.log(`📅 매칭 날짜: ${todayDate}`);
  console.log(`📅 제출 날짜: ${yesterdayDate}`);
  console.log(`❓ 질문: ${question}`);
  console.log(`🏢 Cohort ID: ${COHORT_ID}\n`);

  // 1. 참가자 조회 (슈퍼관리자 제외)
  const participantsSnapshot = await db
    .collection('participants')
    .where('cohortId', '==', COHORT_ID)
    .get();

  const participants = participantsSnapshot.docs
    .map(doc => ({
      id: doc.id,
      name: doc.data().name,
      isSuperAdmin: doc.data().isSuperAdmin || false,
      gender: doc.data().gender,
    }))
    .filter(p => !p.isSuperAdmin); // 슈퍼관리자 제외

  console.log(`👥 전체 참가자: ${participants.length}명\n`);

  if (participants.length < 4) {
    console.log('❌ 참가자가 너무 적습니다. 최소 4명이 필요합니다.');
    return;
  }

  // 2. 랜덤 매칭 생성
  const assignments: Record<string, {
    similar: string[];
    opposite: string[];
    reasons: null;
  }> = {};

  participants.forEach(participant => {
    // 자기 자신 제외한 나머지 참가자들
    const others = participants.filter(p => p.id !== participant.id);

    // 완전 랜덤으로 유사 2명 선택
    const similar = pickRandom(others.map(p => p.id), 2);

    // 유사에 선택된 사람 제외하고 반대 2명 선택
    const opposite = pickRandom(
      others.filter(p => !similar.includes(p.id)).map(p => p.id),
      2
    );

    assignments[participant.id] = {
      similar,
      opposite,
      reasons: null, // 랜덤 매칭이므로 이유 없음
    };
  });

  console.log('✅ 랜덤 매칭 완료\n');

  // 3. 샘플 출력 (처음 3명만)
  console.log('📊 매칭 샘플 (처음 3명):');
  participants.slice(0, 3).forEach((participant, idx) => {
    const assignment = assignments[participant.id];
    const similarNames = assignment.similar
      .map(id => participants.find(p => p.id === id)?.name || id)
      .join(', ');
    const oppositeNames = assignment.opposite
      .map(id => participants.find(p => p.id === id)?.name || id)
      .join(', ');

    console.log(`\n${idx + 1}. ${participant.name} (${participant.id})`);
    console.log(`   유사: ${similarNames}`);
    console.log(`   반대: ${oppositeNames}`);
  });

  // 4. Firebase 저장
  console.log(`\n💾 Firebase 저장 중... (cohorts/${COHORT_ID})`);

  const cohortRef = db.collection('cohorts').doc(COHORT_ID);

  await cohortRef.update({
    [`dailyFeaturedParticipants.${todayDate}`]: {
      question,
      assignments,
      submissionStats: {
        totalSubmissions: participants.length,
        processedSubmissions: participants.length,
      },
      publishedAt: new Date().toISOString(),
      matchingType: 'random', // 랜덤 매칭임을 표시
    },
  });

  console.log('✅ 저장 완료!');
  console.log(`\n🎯 오늘의 서재에서 확인할 수 있습니다.`);
  console.log(`📅 발행일: ${todayDate}`);
  console.log(`👥 매칭된 참가자: ${participants.length}명\n`);
}

randomMatching()
  .then(() => {
    console.log('✅ 랜덤 매칭 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
