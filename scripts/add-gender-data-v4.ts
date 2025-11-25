/**
 * 4기 참가자 성별 데이터 추가 스크립트 (CSV 기반)
 *
 * 실행: npx tsx scripts/add-gender-data-v4.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore(admin.app(), 'seoul');

// CSV 데이터 (이름,성별,그룹,연락처)
const csvData = [
  { name: '이예림', genderRaw: '여', group: 'A', phone: '010-3489-9982' },
  { name: '김동현', genderRaw: '남', group: 'A', phone: '010-4300-0660' },
  { name: '김혜진', genderRaw: '여', group: 'A', phone: '010-4645-1846' },
  { name: '박진우', genderRaw: '남', group: 'A', phone: '010-5580-1188' },
  { name: '천희승', genderRaw: '남', group: 'A', phone: '010-9222-7199' },
  { name: '정석원', genderRaw: '남', group: 'A', phone: '010-2876-3033' },
  { name: '배수진', genderRaw: '여', group: 'A', phone: '010-9552-9592' },
  { name: '왕기영', genderRaw: '남', group: 'A', phone: '010-4261-5118' },
  { name: '이호준', genderRaw: '남', group: 'A', phone: '010-8946-5025' },
  { name: '고유경', genderRaw: '여', group: 'A', phone: '010-2579-5135' },
  { name: '이혜란', genderRaw: '여', group: 'A', phone: '010-6631-7846' },
  { name: '이세온', genderRaw: '여', group: 'A', phone: '010-4567-8867' },
  { name: '박혜민', genderRaw: '여', group: 'A', phone: '010-5068-4917' },
  { name: '임지효', genderRaw: '여', group: 'A', phone: '010-4081-0571' },
  { name: '박하현', genderRaw: '여', group: 'A', phone: '010-9062-3469' },
  { name: '곽선화', genderRaw: '여', group: 'A', phone: '010-5167-3468' },
  { name: '김주현', genderRaw: '남', group: 'A', phone: '010-8615-8479' },
  { name: '허준범', genderRaw: '남', group: 'A', phone: '010-4568-1591' },
  { name: '백은우', genderRaw: '여', group: 'A', phone: '010-2557-0405' },
  { name: '조예진', genderRaw: '여', group: 'A', phone: '010-5421-9470' },
  { name: '김지수', genderRaw: '여', group: 'A', phone: '010-4058-8731' },
  { name: '천혜리', genderRaw: '여', group: 'A', phone: '010-9378-4559' },
  { name: '이정윤', genderRaw: '여', group: 'A', phone: '010-9865-3479' },
  { name: '신동순', genderRaw: '남', group: 'A', phone: '010-9525-2757' },
  { name: '안동민', genderRaw: '남', group: 'A', phone: '010-5106-3107' },
  { name: '윤중현', genderRaw: '남', group: 'A', phone: '010-3759-9383' },
  { name: '김가연', genderRaw: '여', group: 'A', phone: '010-8306-2467' },
  { name: '박성혁', genderRaw: '남', group: 'A', phone: '010-7268-9572' },
  { name: '구태경', genderRaw: '남', group: 'A', phone: '010-5069-4334' },
  { name: '방유라', genderRaw: '여', group: 'B', phone: '010-3353-4637' },
  { name: '김혜미', genderRaw: '여', group: 'B', phone: '010-2574-0917' },
  { name: '정양원', genderRaw: '남', group: 'B', phone: '010-8664-2851' },
  { name: '김강선(아론 헌트)', genderRaw: '남', group: 'B', phone: '010-2485-9268' },
  { name: '배현지', genderRaw: '여', group: 'B', phone: '010-2813-7600' },
  { name: '박성현', genderRaw: '남', group: 'B', phone: '010-2710-6413' },
  { name: '최명진', genderRaw: '남', group: 'B', phone: '010-7541-5983' },
  { name: '이연수', genderRaw: '여', group: 'B', phone: '010-5218-1265' },
  { name: '유소영', genderRaw: '여', group: 'B', phone: '010-3137-9104' },
  { name: '강아영', genderRaw: '여', group: 'B', phone: '010-3422-1266' },
  { name: '권숙연', genderRaw: '여', group: 'B', phone: '010-7536-3778' },
  { name: '임하영', genderRaw: '여', group: 'B', phone: '010-9906-0971' },
  { name: '정연우', genderRaw: '남', group: 'B', phone: '010-2058-9835' },
  { name: '이주은', genderRaw: '여', group: 'B', phone: '010-8056-0614' },
  { name: '윤정아', genderRaw: '여', group: 'B', phone: '010-6560-6421' },
  { name: '박인찬', genderRaw: '남', group: 'B', phone: '010-7399-3490' },
  { name: '김영훈', genderRaw: '남', group: 'B', phone: '010-9189-5218' },
  { name: '박선화', genderRaw: '여', group: 'B', phone: '010-6236-3966' },
  { name: '박지혜', genderRaw: '여', group: 'B', phone: '010-8765-0436' },
  { name: '김지현', genderRaw: '여', group: 'B', phone: '010-4379-9928' },
  { name: '장예진', genderRaw: '여', group: 'B', phone: '010-2816-7414' },
  { name: '박예림', genderRaw: '여', group: 'B', phone: '010-8562-6451' },
  { name: '정다운', genderRaw: '여', group: 'B', phone: '010-6737-6209' },
  { name: '전선우', genderRaw: '남', group: 'B', phone: '010-4090-5438' },
  { name: '김건식', genderRaw: '남', group: 'B', phone: '010-2287-2845' },
  { name: '김범수', genderRaw: '남', group: 'B', phone: '010-9232-3509' },
  { name: '심우경', genderRaw: '남', group: 'B', phone: '010-8833-9658' },
  { name: '최선민', genderRaw: '남', group: 'B', phone: '010-4785-2183' },
  { name: '이재학', genderRaw: '남', group: 'B', phone: '010-2623-7641' },
];

// 그룹 매핑
const groupMap: Record<string, string> = {
  'A': '4-1',
  'B': '4-2',
};

// 성별 매핑
function normalizeGender(raw: string): 'male' | 'female' | null {
  if (raw === '남') return 'male';
  if (raw === '여') return 'female';
  return null;
}

async function addGenderDataV4(dryRun = true) {
  console.log(`\n📊 4기 참가자 성별 데이터 추가 ${dryRun ? '(DRY RUN)' : '(실제 적용)'}\n`);

  let updatedCount = 0;
  let notFoundCount = 0;
  const notFoundNames: string[] = [];

  for (const entry of csvData) {
    const { name, genderRaw, group, phone } = entry;
    const cohortId = groupMap[group];
    const gender = normalizeGender(genderRaw);
    
    if (!cohortId || !gender) {
      console.log(`⚠️  스킵: ${name} (그룹 ${group} 또는 성별 ${genderRaw} 불명확)`);
      continue;
    }

    // 참가자 찾기 (이름 + cohortId)
    const participantsSnapshot = await db
      .collection('participants')
      .where('cohortId', '==', cohortId)
      .where('name', '==', name)
      .get();

    let targetDoc = null;

    if (participantsSnapshot.empty) {
        // 이름으로 못 찾으면... 로깅하고 넘어감
        // 김강선(아론 헌트) 같은 경우 처리가 필요할 수 있음
        if (name.includes('(')) {
             const simplifiedName = name.split('(')[0];
             const secondTry = await db.collection('participants')
                .where('cohortId', '==', cohortId)
                .where('name', '==', simplifiedName)
                .get();
             
             if (!secondTry.empty) {
                 targetDoc = secondTry.docs[0];
             }
        }
        
        if (!targetDoc) {
            console.log(`❌ 찾을 수 없음: ${name} (Cohort ${cohortId})`);
            notFoundNames.push(`${name} (${cohortId})`);
            notFoundCount++;
            continue;
        }
    } else {
        targetDoc = participantsSnapshot.docs[0];
    }

    // 데이터 업데이트
    if (targetDoc) {
        const currentData = targetDoc.data();
        if (currentData.gender === gender) {
             console.log(`✓ ${name}: 이미 성별 있음 (${gender})`);
             continue;
        }

        console.log(`${dryRun ? '[DRY]' : '✅'} ${name} (Cohort ${cohortId}): ${gender} 업데이트`);
        
        if (!dryRun) {
            await db.collection('participants').doc(targetDoc.id).update({
                gender,
                updatedAt: admin.firestore.Timestamp.now()
            });
        }
        updatedCount++;
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`\n📊 요약:`);
  console.log(`   대상: ${csvData.length}명`);
  console.log(`   업데이트 예정/완료: ${updatedCount}명`);
  console.log(`   찾을 수 없음: ${notFoundCount}명`);

  if (notFoundNames.length > 0) {
    console.log(`\n⚠️  찾을 수 없는 참가자:`);
    notFoundNames.forEach(name => console.log(`   - ${name}`));
  }

  if (dryRun) {
    console.log(`\n💡 실제 적용하려면: npx tsx scripts/add-gender-data-v4.ts --apply\n`);
  } else {
    console.log(`\n✅ 성별 데이터 추가 완료!\n`);
  }
}

async function main() {
  try {
    const dryRun = !process.argv.includes('--apply');
    await addGenderDataV4(dryRun);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

