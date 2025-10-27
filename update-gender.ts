import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { getFirebaseAdmin } from './src/lib/firebase/admin-init';

interface CSVRow {
  이름: string;
  성별: string;
  연락처: string;
  [key: string]: any;
}

function normalizePhone(phone: string): string {
  // 전화번호 정규화: +82, 0, -, 공백 제거하고 숫자만 추출
  return phone
    .replace(/^\+82\s*/, '0')  // +82를 0으로 변환
    .replace(/[^\d]/g, '')      // 숫자만 남김
    .slice(-10);                 // 마지막 10자리만 (01012345678 -> 1012345678)
}

async function updateGenderFromCSV() {
  const { db } = getFirebaseAdmin();

  // CSV 파일 읽기
  const csvPath = '/Users/jclee/Downloads/10월 멤버십-2기 멤버 리스트 (1).csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // CSV 파싱
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true, // UTF-8 BOM 제거
  }) as CSVRow[];

  console.log(`📊 CSV에서 ${records.length}명의 데이터를 읽었습니다.\n`);

  // 전화번호-성별 매핑 생성
  const genderMap = new Map<string, { name: string; gender: 'male' | 'female' }>();
  records.forEach((row) => {
    const name = row['이름']?.trim();
    const gender = row['성별']?.trim();
    const phone = row['연락처']?.trim();

    if (name && gender && phone) {
      // '남' -> 'male', '여' -> 'female'
      const normalizedGender = gender === '남' ? 'male' : gender === '여' ? 'female' : null;
      if (normalizedGender) {
        const normalizedPhone = normalizePhone(phone);
        genderMap.set(normalizedPhone, { name, gender: normalizedGender });
      }
    }
  });

  console.log(`✅ ${genderMap.size}명의 전화번호-성별 매핑을 생성했습니다.\n`);

  // Firestore에서 2기 참가자 조회
  const participantsSnapshot = await db
    .collection('participants')
    .where('cohortId', '==', '2')
    .get();

  console.log(`📦 Firestore에서 ${participantsSnapshot.size}명의 2기 참가자를 찾았습니다.\n`);

  let updatedCount = 0;
  let notFoundCount = 0;
  const notFoundList: Array<{ name: string; phone: string }> = [];

  // 각 참가자의 gender 필드 업데이트
  for (const doc of participantsSnapshot.docs) {
    const data = doc.data();
    const participantName = data.name;
    const participantPhone = data.phoneNumber;

    if (!participantPhone) {
      console.log(`✗ ${participantName}: 전화번호 없음`);
      notFoundList.push({ name: participantName, phone: '없음' });
      notFoundCount++;
      continue;
    }

    const normalizedPhone = normalizePhone(participantPhone);
    const match = genderMap.get(normalizedPhone);

    if (match) {
      await doc.ref.update({ gender: match.gender });
      console.log(`✓ ${participantName} (${match.name}): ${match.gender}`);
      updatedCount++;
    } else {
      console.log(`✗ ${participantName}: 전화번호 매칭 실패 (${normalizedPhone})`);
      notFoundList.push({ name: participantName, phone: normalizedPhone });
      notFoundCount++;
    }
  }

  console.log(`\n=== 업데이트 완료 ===`);
  console.log(`✅ 성공: ${updatedCount}명`);
  console.log(`❌ 실패: ${notFoundCount}명`);

  if (notFoundList.length > 0) {
    console.log(`\n매칭 실패 목록:`);
    notFoundList.forEach(({ name, phone }) => console.log(`  - ${name} (${phone})`));
  }

  process.exit(0);
}

updateGenderFromCSV().catch((error) => {
  console.error('오류 발생:', error);
  process.exit(1);
});
