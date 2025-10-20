#!/usr/bin/env node
/**
 * 어제(2025-10-20) 전산 장애로 인증 못한 유저들에게 인증 데이터 추가
 *
 * 실행 방법:
 * npx tsx src/scripts/add-backdated-submissions-yesterday.ts
 *
 * 대상:
 * - 1기 코호트 참가자
 * - 어제(2025-10-20) 인증 안한 사람
 * - 슈퍼관리자(isSuperAdmin: true) 제외
 * - 일반 관리자 + 일반 유저 모두 포함
 */

import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';
import { format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';

// Firebase Admin SDK 초기화
const serviceAccount = JSON.parse(
  readFileSync(join(process.cwd(), 'firebase-service-account.json'), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'philipandsophy',
  });
}

const db = admin.firestore();

// 상수 정의
const TARGET_DATE = '2025-10-20'; // 어제 날짜
const COHORT_ID = '1'; // 1기 코호트 ID
const REVIEW_TEXT = '여러분의 독서 생활을 응원합니다! -필립앤소피-';
const ANSWER_TEXT = '항상 꿈과 낭만, 열정이 여러분과 함께하길 바랍니다.';

interface Participant {
  id: string;
  name: string;
  phoneNumber: string;
  isSuperAdmin?: boolean;
  isAdministrator?: boolean;
}

interface Submission {
  participantId: string;
  submissionDate: string;
}

/**
 * 1단계: 어제 인증 안한 대상 유저 조회
 */
async function getTargetParticipants(): Promise<Participant[]> {
  console.log(`\n🔍 1기 코호트(${COHORT_ID})의 어제(${TARGET_DATE}) 미인증 유저 조회 중...\n`);

  // 1. 1기 참가자 전체 조회
  const participantsSnapshot = await db
    .collection('participants')
    .where('cohortId', '==', COHORT_ID)
    .get();

  const allParticipants: Participant[] = participantsSnapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name || '이름 없음',
    phoneNumber: doc.data().phoneNumber || '-',
    isSuperAdmin: doc.data().isSuperAdmin || false,
    isAdministrator: doc.data().isAdministrator || false,
  }));

  console.log(`📊 1기 총 참가자 수: ${allParticipants.length}명`);

  // 2. 슈퍼관리자 제외
  const nonSuperAdminParticipants = allParticipants.filter(
    p => !p.isSuperAdmin
  );
  console.log(`✅ 슈퍼관리자 제외: ${nonSuperAdminParticipants.length}명`);

  // 3. 어제 인증한 사람 조회
  const submissionsSnapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', TARGET_DATE)
    .get();

  const submittedParticipantIds = new Set<string>();
  submissionsSnapshot.docs.forEach(doc => {
    const data = doc.data() as Submission;
    submittedParticipantIds.add(data.participantId);
  });

  console.log(`📝 어제 인증한 사람: ${submittedParticipantIds.size}명`);

  // 4. 어제 인증 안한 사람 필터링
  const targetParticipants = nonSuperAdminParticipants.filter(
    p => !submittedParticipantIds.has(p.id)
  );

  console.log(`🎯 어제 미인증 대상자: ${targetParticipants.length}명\n`);

  return targetParticipants;
}

/**
 * 2단계: 대상 유저 목록 출력
 */
function displayTargetList(participants: Participant[]): void {
  console.log('='.repeat(80));
  console.log('📋 어제(2025-10-20) 미인증 대상자 목록');
  console.log('='.repeat(80));
  console.log(
    '번호'.padEnd(6) +
    '이름'.padEnd(15) +
    '전화번호'.padEnd(20) +
    '역할'
  );
  console.log('-'.repeat(80));

  participants.forEach((p, index) => {
    const num = (index + 1).toString().padEnd(6);
    const name = p.name.padEnd(15);
    const phone = p.phoneNumber.padEnd(20);
    const role = p.isAdministrator ? '일반 관리자' : '일반 유저';

    console.log(num + name + phone + role);
  });

  console.log('='.repeat(80));
  console.log(`\n총 ${participants.length}명에게 어제 날짜로 인증 데이터를 추가합니다.`);
  console.log(`독서 감상평: "${REVIEW_TEXT}"`);
  console.log(`가치관 답변: "${ANSWER_TEXT}"`);
  console.log(`인증 이미지: /Downloads/books.jpeg (업로드 필요)\n`);
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    // 1단계: 대상 유저 조회
    const targetParticipants = await getTargetParticipants();

    if (targetParticipants.length === 0) {
      console.log('✅ 어제 인증 안한 유저가 없습니다. 작업을 종료합니다.\n');
      return;
    }

    // 2단계: 대상 목록 출력
    displayTargetList(targetParticipants);

    console.log('⚠️  다음 단계:');
    console.log('1. 위 목록을 확인하세요');
    console.log('2. books.jpeg 이미지를 Firebase Storage에 업로드해야 합니다');
    console.log('3. 확인 후 실제 데이터 추가 로직을 실행하세요\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main()
  .then(() => {
    console.log('✅ 대상 조회 완료!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });
