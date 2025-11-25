const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
db.settings({ databaseId: 'seoul' });

async function getParticipantsGender(cohortId) {
  const snapshot = await db.collection('participants')
    .where('cohortId', '==', cohortId)
    .get();

  const genderMap = new Map();
  snapshot.forEach(doc => {
    const data = doc.data();
    genderMap.set(doc.id, {
      name: data.name || doc.id,
      gender: data.gender
    });
  });
  return genderMap;
}

async function evaluateClusterMatching() {
  const targetDate = '2025-11-25';
  const cohorts = ['4-1', '4-2'];

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 클러스터 매칭 평가 - ${targetDate}`);
  console.log(`${'='.repeat(80)}\n`);

  for (const cohortId of cohorts) {
    const docId = `${cohortId}-${targetDate}`;
    const doc = await db.collection('matching_results').doc(docId).get();

    if (!doc.exists) {
      console.log(`❌ ${cohortId}: 매칭 결과 없음\n`);
      continue;
    }

    const data = doc.data();
    const matching = data.matching;

    // 참가자 성별 정보 조회
    const genderMap = await getParticipantsGender(cohortId);

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`🎯 코호트 ${cohortId}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`총 참가자: ${data.totalParticipants}명`);
    console.log(`클러스터 수: ${data.clusterCount}개`);
    console.log(`매칭 시간: ${data.confirmedAt?._seconds ? new Date(data.confirmedAt._seconds * 1000).toLocaleString('ko-KR') : 'N/A'}`);

    // 각 클러스터 분석
    const clusters = matching.clusters || {};
    let totalMale = 0;
    let totalFemale = 0;
    let totalOther = 0;
    let totalUnknown = 0;

    console.log(`\n📋 클러스터 상세:\n`);

    for (const [clusterKey, clusterData] of Object.entries(clusters)) {
      const memberIds = clusterData.memberIds || [];

      // 성별 카운트
      let male = 0, female = 0, other = 0, unknown = 0;

      const memberDetails = [];
      for (const memberId of memberIds) {
        const participant = genderMap.get(memberId);
        const gender = participant?.gender;
        const name = participant?.name || memberId;

        if (gender === 'male') { male++; totalMale++; }
        else if (gender === 'female') { female++; totalFemale++; }
        else if (gender === 'other') { other++; totalOther++; }
        else { unknown++; totalUnknown++; }

        memberDetails.push({ id: memberId, name, gender });
      }

      // 성비 계산
      const total = memberIds.length;
      const maleRatio = total > 0 ? ((male / total) * 100).toFixed(0) : 0;
      const femaleRatio = total > 0 ? ((female / total) * 100).toFixed(0) : 0;

      // 성비 평가
      let genderBalance = '';
      if (male === 0 && female > 0) genderBalance = '⚠️ 여성만';
      else if (female === 0 && male > 0) genderBalance = '⚠️ 남성만';
      else if (Math.abs(male - female) <= 1) genderBalance = '✅ 균형';
      else if (Math.abs(male - female) <= 2) genderBalance = '🔶 양호';
      else genderBalance = '⚠️ 불균형';

      console.log(`┌─ ${clusterData.emoji || '📌'} "${clusterData.name}"`);
      console.log(`│  테마: ${clusterData.theme || 'N/A'}`);
      console.log(`│  카테고리: ${clusterData.category || 'N/A'}`);
      console.log(`│  인원: ${total}명 (남${male} 여${female}${other > 0 ? ` 기타${other}` : ''}${unknown > 0 ? ` 미지정${unknown}` : ''})`);
      console.log(`│  성비: 남 ${maleRatio}% / 여 ${femaleRatio}% ${genderBalance}`);
      console.log(`│  사유: ${clusterData.reasoning || 'N/A'}`);
      console.log(`│  멤버:`);

      for (const member of memberDetails) {
        const genderIcon = member.gender === 'male' ? '♂️' : member.gender === 'female' ? '♀️' : '⚪';
        console.log(`│    ${genderIcon} ${member.name}`);
      }
      console.log(`└${'─'.repeat(40)}\n`);
    }

    // 전체 성비 요약
    const grandTotal = totalMale + totalFemale + totalOther + totalUnknown;
    console.log(`\n📈 코호트 ${cohortId} 전체 성비 요약:`);
    console.log(`   남성: ${totalMale}명 (${grandTotal > 0 ? ((totalMale/grandTotal)*100).toFixed(1) : 0}%)`);
    console.log(`   여성: ${totalFemale}명 (${grandTotal > 0 ? ((totalFemale/grandTotal)*100).toFixed(1) : 0}%)`);
    if (totalOther > 0) {
      console.log(`   기타: ${totalOther}명 (${((totalOther/grandTotal)*100).toFixed(1)}%)`);
    }
    if (totalUnknown > 0) {
      console.log(`   미지정: ${totalUnknown}명 (${((totalUnknown/grandTotal)*100).toFixed(1)}%)`);
    }

    // 단일 성별 클러스터 체크
    let singleGenderClusters = [];
    for (const [key, clusterData] of Object.entries(clusters)) {
      const memberIds = clusterData.memberIds || [];
      let males = 0, females = 0;

      for (const memberId of memberIds) {
        const participant = genderMap.get(memberId);
        if (participant?.gender === 'male') males++;
        else if (participant?.gender === 'female') females++;
      }

      if (males === 0 && females > 0) {
        singleGenderClusters.push({ name: clusterData.name, type: '여성만', count: females });
      } else if (females === 0 && males > 0) {
        singleGenderClusters.push({ name: clusterData.name, type: '남성만', count: males });
      }
    }

    console.log(`\n🎯 평가 결과:`);
    if (singleGenderClusters.length === 0) {
      console.log(`   ✅ 모든 클러스터가 남녀 혼성으로 구성됨`);
    } else {
      console.log(`   ⚠️ 단일 성별 클러스터 ${singleGenderClusters.length}개 발견:`);
      for (const cluster of singleGenderClusters) {
        console.log(`      - "${cluster.name}": ${cluster.type} (${cluster.count}명)`);
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`평가 완료`);
  console.log(`${'='.repeat(80)}\n`);

  process.exit(0);
}

evaluateClusterMatching().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
