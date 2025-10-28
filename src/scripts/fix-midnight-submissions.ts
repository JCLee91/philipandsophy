/**
 * 어제 밤 12시~새벽 2시 제출자 데이터 보정
 *
 * 문제 상황:
 * - 새벽 0시~1시 59분에 제출한 사용자들이 잘못된 질문을 받았을 가능성
 * - 예: 10/28 00:30에 제출했는데 10/28 질문을 받음 (10/27 질문을 받았어야 함)
 *
 * 해결 방안:
 * 1. 문제가 있는 제출 식별
 * 2. 올바른 질문으로 업데이트
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import * as path from 'path';
import * as fs from 'fs';

const KOREA_TIMEZONE = 'Asia/Seoul';

// Firebase Admin 초기화 (서비스 계정 키 사용)
let db: ReturnType<typeof getFirestore>;

try {
  // 서비스 계정 키 파일 경로
  const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

  // 파일 존재 여부 확인
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ 서비스 계정 키 파일을 찾을 수 없습니다.');
    console.error('   경로:', serviceAccountPath);
    console.error('\n📝 서비스 계정 키 생성 방법:');
    console.error('   1. Firebase Console > 프로젝트 설정 > 서비스 계정');
    console.error('   2. "새 비공개 키 생성" 클릭');
    console.error('   3. 다운로드한 JSON 파일을 프로젝트 루트에 firebase-service-account.json으로 저장');
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);

  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'philipandsophy',
  });

  db = getFirestore();
  console.log('✅ Firebase Admin SDK 초기화 완료');
} catch (error) {
  console.error('❌ Firebase 초기화 실패:', error);
  process.exit(1);
}

// 질문 데이터 (constants에서 가져온 것)
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

const PROGRAM_START = new Date(2025, 9, 11); // 10월 11일

interface ProblematicSubmission {
  id: string;
  participantId: string;
  submittedAt: Timestamp;
  submissionDate: string;
  dailyQuestion: string;
  correctQuestion: string;
  dayIndex: number;
}

function getCorrectQuestionForDate(dateString: string): string {
  const date = parseISO(dateString);
  const dayIndex = differenceInDays(date, PROGRAM_START);

  if (dayIndex < 0 || dayIndex >= DAILY_QUESTIONS.length) {
    // 프로그램 범위 밖이면 순환
    const adjustedIndex = ((dayIndex % DAILY_QUESTIONS.length) + DAILY_QUESTIONS.length) % DAILY_QUESTIONS.length;
    return DAILY_QUESTIONS[adjustedIndex].question;
  }

  return DAILY_QUESTIONS[dayIndex].question;
}

async function analyzeMidnightSubmissions() {
  console.log('🔍 새벽 제출 데이터 분석 시작...');

  const submissionsRef = db.collection('reading_submissions');
  const snapshot = await submissionsRef.get();

  const problematic: ProblematicSubmission[] = [];
  let totalCount = 0;
  let midnightCount = 0;
  let incorrectCount = 0;

  for (const doc of snapshot.docs) {
    totalCount++;
    const data = doc.data();
    const submittedAt = data.submittedAt as Timestamp;
    const submissionDate = data.submissionDate as string;
    const dailyQuestion = data.dailyQuestion as string;

    if (!submittedAt || !submissionDate || !dailyQuestion) {
      continue;
    }

    // KST로 변환
    const submittedAtDate = submittedAt.toDate();
    const submittedAtKST = toZonedTime(submittedAtDate, KOREA_TIMEZONE);
    const hour = submittedAtKST.getHours();

    // 새벽 0시~1시 59분에 제출된 경우만 체크
    if (hour >= 0 && hour < 2) {
      midnightCount++;

      // submissionDate 기준 올바른 질문
      const correctQuestion = getCorrectQuestionForDate(submissionDate);

      // 질문이 다른 경우
      if (dailyQuestion !== correctQuestion) {
        incorrectCount++;
        const dayIndex = differenceInDays(parseISO(submissionDate), PROGRAM_START);

        problematic.push({
          id: doc.id,
          participantId: data.participantId,
          submittedAt,
          submissionDate,
          dailyQuestion,
          correctQuestion,
          dayIndex
        });

        console.log(`\n❌ 잘못된 질문 발견: ${doc.id}`);
        console.log(`   참가자: ${data.participantId}`);
        console.log(`   제출 시각: ${format(submittedAtKST, 'yyyy-MM-dd HH:mm:ss')} KST`);
        console.log(`   저장된 날짜: ${submissionDate}`);
        console.log(`   Day ${dayIndex + 1}`);
        console.log(`   현재 질문: "${dailyQuestion.substring(0, 30)}..."`);
        console.log(`   올바른 질문: "${correctQuestion.substring(0, 30)}..."`);
      }
    }
  }

  console.log('\n📊 분석 결과:');
  console.log(`- 전체 제출물: ${totalCount}개`);
  console.log(`- 새벽 제출 (0-2시): ${midnightCount}개`);
  console.log(`- 잘못된 질문: ${incorrectCount}개`);

  return problematic;
}

async function fixIncorrectQuestions(problematic: ProblematicSubmission[], dryRun: boolean = true) {
  if (problematic.length === 0) {
    console.log('✅ 수정할 데이터가 없습니다.');
    return;
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN 모드 - 실제 수정하지 않음');
    console.log('실제 수정하려면 --execute 플래그를 추가하세요');

    // 보정 계획 상세 출력
    console.log('\n📝 보정 계획:');
    problematic.forEach(item => {
      console.log(`\n문서 ID: ${item.id}`);
      console.log(`Day ${item.dayIndex + 1} 질문으로 변경 예정`);
    });

    return;
  }

  console.log(`\n🔧 ${problematic.length}개 질문 수정 시작...`);

  const batch = db.batch();
  let batchCount = 0;

  for (const item of problematic) {
    const docRef = db.collection('reading_submissions').doc(item.id);

    // dailyQuestion만 수정, dailyAnswer는 유지
    batch.update(docRef, {
      dailyQuestion: item.correctQuestion,
      _correctionNote: 'Question corrected for 2AM policy',
      _correctionDate: Timestamp.now()
    });

    batchCount++;

    if (batchCount === 500) {
      await batch.commit();
      console.log(`✅ ${batchCount}개 수정 완료`);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`✅ ${batchCount}개 수정 완료`);
  }

  console.log('\n🎉 모든 질문 수정 완료!');
}

async function main() {
  try {
    const isDryRun = !process.argv.includes('--execute');

    console.log('🚀 새벽 제출 질문 보정 시작');
    console.log(`모드: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
    console.log('=====================================\n');

    const problematic = await analyzeMidnightSubmissions();
    await fixIncorrectQuestions(problematic, isDryRun);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main();