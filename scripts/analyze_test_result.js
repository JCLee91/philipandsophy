const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// 테스트 결과 (방금 받은 데이터)
const testResult = {
  clusters: {
    cluster1: {
      name: "다정한 의미 탐구자",
      memberIds: ["cohort4-2-지혜", "cohort4-2-선민", "cohort4-2-영훈", "cohort4-2-명진", "cohort4-2-소영", "cohort4-2-선우"]
    },
    cluster2: {
      name: "신중한 가치 수호자",
      memberIds: ["cohort4-2-숙연", "cohort4-2-선화", "cohort4-2-유라", "cohort4-2-양원", "cohort4-2-성현", "cohort4-2-인찬"]
    },
    cluster3: {
      name: "성숙한 존중주의자",
      memberIds: ["cohort4-2-범수", "cohort4-2-예진", "cohort4-2-아영", "cohort4-2-연우", "cohort4-2-혜미", "cohort4-2-주은"]
    }
  }
};

async function analyzeGenderBalance() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Gemini 3 Pro 테스트 결과 - 성비 분석`);
  console.log(`${'='.repeat(60)}\n`);

  // 참가자 성별 정보 조회
  const snapshot = await db.collection('participants')
    .where('cohortId', '==', '4-2')
    .get();

  const genderMap = new Map();
  snapshot.forEach(doc => {
    genderMap.set(doc.id, {
      name: doc.data().name,
      gender: doc.data().gender
    });
  });

  let totalMale = 0, totalFemale = 0;
  let singleGenderClusters = [];

  for (const [clusterId, cluster] of Object.entries(testResult.clusters)) {
    let male = 0, female = 0;
    const members = [];

    for (const memberId of cluster.memberIds) {
      const participant = genderMap.get(memberId);
      if (participant?.gender === 'male') { male++; totalMale++; }
      else if (participant?.gender === 'female') { female++; totalFemale++; }
      members.push({
        id: memberId,
        name: participant?.name || memberId,
        gender: participant?.gender
      });
    }

    const total = cluster.memberIds.length;
    const maleRatio = ((male / total) * 100).toFixed(0);
    const femaleRatio = ((female / total) * 100).toFixed(0);

    let balanceStatus = '';
    if (male === 0 && female > 0) {
      balanceStatus = '❌ 여성만';
      singleGenderClusters.push(cluster.name);
    } else if (female === 0 && male > 0) {
      balanceStatus = '❌ 남성만';
      singleGenderClusters.push(cluster.name);
    } else if (Math.abs(male - female) <= 1) {
      balanceStatus = '✅ 균형';
    } else if (Math.abs(male - female) <= 2) {
      balanceStatus = '🔶 양호';
    } else {
      balanceStatus = '⚠️ 불균형';
    }

    console.log(`┌─ "${cluster.name}"`);
    console.log(`│  인원: ${total}명 (남${male} 여${female})`);
    console.log(`│  성비: 남 ${maleRatio}% / 여 ${femaleRatio}% ${balanceStatus}`);
    console.log(`│  멤버:`);
    for (const m of members) {
      const icon = m.gender === 'male' ? '♂️' : m.gender === 'female' ? '♀️' : '⚪';
      console.log(`│    ${icon} ${m.name}`);
    }
    console.log(`└${'─'.repeat(50)}\n`);
  }

  console.log(`\n📈 전체 성비: 남${totalMale} 여${totalFemale}`);

  console.log(`\n🎯 최종 평가:`);
  if (singleGenderClusters.length === 0) {
    console.log(`   ✅ 모든 클러스터가 남녀 혼성으로 구성됨!`);
    console.log(`   ✅ Gemini 3 Pro + 강화된 프롬프트 + 검증 로직 = 성공`);
  } else {
    console.log(`   ❌ 단일 성별 클러스터 발견: ${singleGenderClusters.join(', ')}`);
  }

  process.exit(0);
}

analyzeGenderBalance().catch(console.error);
