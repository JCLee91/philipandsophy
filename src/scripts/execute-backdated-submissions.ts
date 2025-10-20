#!/usr/bin/env node
/**
 * 어제(2025-10-20) 전산 장애로 인증 못한 유저들에게 인증 데이터 추가 - 실행 스크립트
 *
 * 실행 방법:
 * npx tsx src/scripts/execute-backdated-submissions.ts
 *
 * 수행 작업:
 * 1. books.jpeg 이미지를 Firebase Storage에 업로드
 * 2. 대상 유저 15명에게 어제(2025-10-20) 날짜로 인증 데이터 추가
 */

import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as os from 'os';

// Firebase Admin SDK 초기화
const serviceAccount = JSON.parse(
  readFileSync(join(process.cwd(), 'firebase-service-account.json'), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'philipandsophy',
    storageBucket: 'philipandsophy.firebasestorage.app',
  });
}

const db = admin.firestore();
const storage = admin.storage();

// 상수 정의
const TARGET_DATE = '2025-10-20'; // 어제 날짜
const COHORT_ID = '1'; // 1기 코호트 ID
const REVIEW_TEXT = '여러분의 독서 생활을 응원합니다! -필립앤소피-';
const ANSWER_TEXT = '항상 꿈과 낭만, 열정이 여러분과 함께하길 바랍니다.';
const DAILY_QUESTION = '오늘 하루를 책과 함께 보내신 소감은 어떠신가요?'; // 기본 질문
const IMAGE_PATH = join(os.homedir(), 'Downloads', 'books.jpeg');

interface Participant {
  id: string;
  name: string;
  phoneNumber: string;
  currentBookTitle?: string;
  isSuperAdmin?: boolean;
  isAdministrator?: boolean;
}

/**
 * 대상 유저 조회 (어제 인증 안한 사람)
 */
async function getTargetParticipants(): Promise<Participant[]> {
  console.log(`\n🔍 대상 유저 조회 중...\n`);

  // 1. 1기 참가자 조회 (슈퍼관리자 제외)
  const participantsSnapshot = await db
    .collection('participants')
    .where('cohortId', '==', COHORT_ID)
    .get();

  const allParticipants: Participant[] = participantsSnapshot.docs
    .map(doc => ({
      id: doc.id,
      name: doc.data().name || '이름 없음',
      phoneNumber: doc.data().phoneNumber || '-',
      currentBookTitle: doc.data().currentBookTitle,
      isSuperAdmin: doc.data().isSuperAdmin || false,
      isAdministrator: doc.data().isAdministrator || false,
    }))
    .filter(p => !p.isSuperAdmin); // 슈퍼관리자 제외

  // 2. 어제 인증한 사람 조회
  const submissionsSnapshot = await db
    .collection('reading_submissions')
    .where('submissionDate', '==', TARGET_DATE)
    .get();

  const submittedParticipantIds = new Set<string>();
  submissionsSnapshot.docs.forEach(doc => {
    submittedParticipantIds.add(doc.data().participantId);
  });

  // 3. 어제 인증 안한 사람 필터링
  const targetParticipants = allParticipants.filter(
    p => !submittedParticipantIds.has(p.id)
  );

  console.log(`✅ 대상자: ${targetParticipants.length}명`);

  return targetParticipants;
}

/**
 * 이미지를 Firebase Storage에 업로드
 */
async function uploadImageToStorage(): Promise<string> {
  console.log(`\n📤 이미지 업로드 중...`);
  console.log(`  경로: ${IMAGE_PATH}`);

  const bucket = storage.bucket();
  const timestamp = Date.now();
  const destination = `backdated_submissions/books_${timestamp}.jpeg`;

  try {
    // 이미지 읽기 및 업로드
    const imageBuffer = readFileSync(IMAGE_PATH);
    const file = bucket.file(destination);

    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
      },
    });

    // Public URL 생성
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

    console.log(`✅ 이미지 업로드 완료`);
    console.log(`  URL: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error(`❌ 이미지 업로드 실패:`, error);
    throw error;
  }
}

/**
 * 인증 데이터 추가
 */
async function addSubmissionsForParticipants(
  participants: Participant[],
  imageUrl: string
): Promise<void> {
  console.log(`\n📝 인증 데이터 추가 중...\n`);

  const targetDate = new Date(`${TARGET_DATE}T12:00:00+09:00`); // 어제 정오 (KST)
  const submittedAt = admin.firestore.Timestamp.fromDate(targetDate);

  let successCount = 0;
  let failCount = 0;

  for (const participant of participants) {
    try {
      const bookTitle = participant.currentBookTitle || '독서 중인 책';

      const submissionData = {
        participantId: participant.id,
        participationCode: participant.phoneNumber,
        bookTitle,
        bookImageUrl: imageUrl,
        review: REVIEW_TEXT,
        dailyQuestion: DAILY_QUESTION,
        dailyAnswer: ANSWER_TEXT,
        submittedAt,
        submissionDate: TARGET_DATE,
        status: 'approved',
        createdAt: submittedAt,
        updatedAt: submittedAt,
      };

      await db.collection('reading_submissions').add(submissionData);

      console.log(`✅ ${participant.name} (${participant.phoneNumber})`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${participant.name} 실패:`, error);
      failCount++;
    }
  }

  console.log(`\n📊 결과 요약:`);
  console.log(`  성공: ${successCount}명`);
  console.log(`  실패: ${failCount}명`);
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log('='.repeat(80));
    console.log('🚀 어제(2025-10-20) 인증 데이터 소급 추가 시작');
    console.log('='.repeat(80));

    // 1단계: 대상 유저 조회
    const targetParticipants = await getTargetParticipants();

    if (targetParticipants.length === 0) {
      console.log('\n✅ 대상자가 없습니다. 작업을 종료합니다.\n');
      return;
    }

    // 2단계: 이미지 업로드
    const imageUrl = await uploadImageToStorage();

    // 3단계: 인증 데이터 추가
    await addSubmissionsForParticipants(targetParticipants, imageUrl);

    console.log('\n' + '='.repeat(80));
    console.log('✅ 모든 작업 완료!');
    console.log('='.repeat(80));
    console.log(`\n독서 감상평: "${REVIEW_TEXT}"`);
    console.log(`가치관 답변: "${ANSWER_TEXT}"`);
    console.log(`이미지 URL: ${imageUrl}\n`);

  } catch (error) {
    console.error('\n❌ 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 실행 전 확인 메시지
console.log('\n⚠️  경고: 이 스크립트는 실제 데이터베이스를 수정합니다.');
console.log('⚠️  계속하려면 Ctrl+C를 눌러 취소하거나, 5초 후 자동으로 실행됩니다...\n');

setTimeout(() => {
  main()
    .then(() => {
      console.log('✅ 스크립트 실행 완료\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}, 5000);
