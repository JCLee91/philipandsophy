/**
 * 새벽 2시 정책에 맞춰 기존 submissionDate 수정
 *
 * 수정 대상:
 * - submittedAt이 00:00~01:59:59 사이인데
 * - submissionDate가 해당 날짜로 저장된 경우
 * → submissionDate를 전날로 수정
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { format, subDays } from 'date-fns';
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

interface SubmissionToFix {
  id: string;
  submittedAt: Timestamp;
  submissionDate: string;
  correctDate: string;
}

async function analyzeSubmissions() {
  console.log('📊 제출 데이터 분석 시작...');

  const submissionsRef = db.collection('reading_submissions');
  const snapshot = await submissionsRef.get();

  const toFix: SubmissionToFix[] = [];
  let totalCount = 0;
  let affectedCount = 0;

  for (const doc of snapshot.docs) {
    totalCount++;
    const data = doc.data();
    const submittedAt = data.submittedAt as Timestamp;
    const submissionDate = data.submissionDate as string;

    if (!submittedAt || !submissionDate) {
      console.warn(`⚠️ 문서 ${doc.id}에 필수 필드 없음`);
      continue;
    }

    // KST로 변환
    const submittedAtDate = submittedAt.toDate();
    const submittedAtKST = toZonedTime(submittedAtDate, KOREA_TIMEZONE);
    const hour = submittedAtKST.getHours();

    // 새벽 0시~1시 59분에 제출된 경우
    if (hour >= 0 && hour < 2) {
      // 현재 저장된 날짜
      const currentDateString = format(submittedAtKST, 'yyyy-MM-dd');

      // 올바른 날짜 (전날)
      const correctDate = format(subDays(submittedAtKST, 1), 'yyyy-MM-dd');

      // 잘못 저장된 경우만 수정 대상
      if (submissionDate === currentDateString && submissionDate !== correctDate) {
        affectedCount++;
        toFix.push({
          id: doc.id,
          submittedAt,
          submissionDate,
          correctDate
        });

        console.log(`📝 수정 대상: ${doc.id}`);
        console.log(`   - 제출 시각: ${format(submittedAtKST, 'yyyy-MM-dd HH:mm:ss')} KST`);
        console.log(`   - 현재 submissionDate: ${submissionDate}`);
        console.log(`   - 수정될 submissionDate: ${correctDate}`);
      }
    }
  }

  console.log('\n📊 분석 결과:');
  console.log(`- 전체 제출물: ${totalCount}개`);
  console.log(`- 수정 필요: ${affectedCount}개`);

  return toFix;
}

async function fixSubmissionDates(toFix: SubmissionToFix[], dryRun: boolean = true) {
  if (toFix.length === 0) {
    console.log('✅ 수정할 데이터가 없습니다.');
    return;
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN 모드 - 실제 수정하지 않음');
    console.log('실제 수정하려면 --execute 플래그를 추가하세요');
    return;
  }

  console.log(`\n🔧 ${toFix.length}개 문서 수정 시작...`);

  let batchCount = 0;
  let totalUpdated = 0;

  // 배치 처리 (최대 500개씩)
  for (let i = 0; i < toFix.length; i += 500) {
    const batch = db.batch();
    const batchItems = toFix.slice(i, Math.min(i + 500, toFix.length));

    for (const item of batchItems) {
      const docRef = db.collection('reading_submissions').doc(item.id);
      batch.update(docRef, {
        submissionDate: item.correctDate,
        _migrationNote: '2AM policy fix applied',
        _migrationDate: Timestamp.now()
      });
      batchCount++;
    }

    await batch.commit();
    totalUpdated += batchCount;
    console.log(`✅ ${totalUpdated}/${toFix.length}개 수정 완료`);
    batchCount = 0;
  }

  console.log('\n🎉 모든 수정 완료!');
}

async function main() {
  try {
    const isDryRun = !process.argv.includes('--execute');

    console.log('🚀 새벽 2시 정책 마이그레이션 시작');
    console.log(`모드: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
    console.log('=====================================\n');

    const toFix = await analyzeSubmissions();
    await fixSubmissionDates(toFix, isDryRun);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main();