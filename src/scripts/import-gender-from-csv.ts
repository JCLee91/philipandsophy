/**
 * CSV 파일에서 성별 정보를 읽어 Firebase participants 컬렉션에 업데이트하는 스크립트
 *
 * 실행 방법:
 * npm run import:gender
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = require('../../firebase-service-account.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

interface CSVRow {
  '이름': string;
  '성별': string;
  '회사/하는일': string;
  '연락처': string;
}

/**
 * CSV 파일에서 성별 정보 읽기
 */
function readGenderFromCSV(csvPath: string): Map<string, 'male' | 'female'> {
  console.log(`📄 CSV 파일 읽기: ${csvPath}\n`);

  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  // BOM 제거
  const cleanContent = fileContent.replace(/^\uFEFF/, '');

  const records = parse(cleanContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  console.log(`📊 총 ${records.length}개의 레코드 발견\n`);

  const genderMap = new Map<string, 'male' | 'female'>();

  records.forEach((row, index) => {
    const name = row['이름']?.trim();
    const gender = row['성별']?.trim();

    if (!name) {
      console.warn(`⚠️  행 ${index + 2}: 이름이 비어있음`);
      return;
    }

    if (!gender || (gender !== '남' && gender !== '여')) {
      console.warn(`⚠️  행 ${index + 2} (${name}): 성별 정보 없음 또는 잘못됨 (${gender})`);
      return;
    }

    const genderValue: 'male' | 'female' = gender === '남' ? 'male' : 'female';
    genderMap.set(name, genderValue);
  });

  console.log(`✅ ${genderMap.size}명의 성별 정보 파싱 완료\n`);

  return genderMap;
}

/**
 * Firebase participants 컬렉션 업데이트
 */
async function updateParticipantsGender(genderMap: Map<string, 'male' | 'female'>) {
  console.log('🔄 Firebase participants 업데이트 시작...\n');

  const participantsSnapshot = await db.collection('participants').get();

  console.log(`📊 Firebase에 총 ${participantsSnapshot.size}명의 참가자 존재\n`);

  let updatedCount = 0;
  let notFoundCount = 0;
  let alreadyHasGender = 0;

  const batch = db.batch();
  const updates: { name: string; gender: 'male' | 'female' }[] = [];

  participantsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const name = data.name?.trim();

    if (!name) {
      console.warn(`⚠️  문서 ${doc.id}: 이름이 없음`);
      return;
    }

    // 이미 gender 필드가 있으면 스킵 (선택사항: 덮어쓰려면 이 조건 제거)
    if (data.gender) {
      alreadyHasGender++;
      console.log(`⏭️  ${name}: 이미 gender 필드 존재 (${data.gender})`);
      return;
    }

    const gender = genderMap.get(name);

    if (!gender) {
      notFoundCount++;
      console.warn(`⚠️  ${name}: CSV에서 성별 정보를 찾을 수 없음`);
      return;
    }

    batch.update(doc.ref, {
      gender,
      updatedAt: Timestamp.now(),
    });

    updates.push({ name, gender });
    updatedCount++;
  });

  if (updatedCount > 0) {
    console.log(`\n📝 업데이트 목록 (${updatedCount}명):`);
    updates.forEach(({ name, gender }) => {
      console.log(`   ✅ ${name}: ${gender === 'male' ? '남자' : '여자'}`);
    });

    console.log('\n💾 Firebase에 변경사항 커밋 중...');
    await batch.commit();
    console.log('✨ 커밋 완료!\n');
  } else {
    console.log('\n⏭️  업데이트할 항목 없음\n');
  }

  // 통계 출력
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 업데이트 통계:');
  console.log(`   ✅ 업데이트 성공: ${updatedCount}명`);
  console.log(`   ⏭️  이미 gender 존재: ${alreadyHasGender}명`);
  console.log(`   ⚠️  CSV에서 찾을 수 없음: ${notFoundCount}명`);
  console.log(`   📊 전체 참가자: ${participantsSnapshot.size}명`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * 메인 함수
 */
async function main() {
  try {
    console.log('🤖 CSV에서 성별 정보 가져와 Firebase 업데이트\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // CSV 파일 경로 (다운로드 폴더에서 찾기)
    const csvPath = '/Users/jclee/Downloads/10월 멤버십-10월 멤버 리스트.csv';

    // 파일 존재 확인
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV 파일을 찾을 수 없습니다: ${csvPath}`);
    }

    // 1. CSV에서 성별 정보 읽기
    const genderMap = readGenderFromCSV(csvPath);

    if (genderMap.size === 0) {
      throw new Error('CSV에서 유효한 성별 정보를 찾을 수 없습니다.');
    }

    // 2. Firebase 업데이트
    await updateParticipantsGender(genderMap);

    console.log('🎉 스크립트 실행 완료!\n');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('✅ 프로세스 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 프로세스 실패:', error);
    process.exit(1);
  });
