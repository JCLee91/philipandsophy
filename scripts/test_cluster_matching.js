/**
 * Gemini 3 Pro 클러스터 매칭 테스트 스크립트
 *
 * 배포된 manualClusterMatching 함수를 호출하여 테스트
 */

const FUNCTION_URL = 'https://manualclustermatching-vliq2xsjqa-du.a.run.app';
const INTERNAL_SECRET = 'vDnfEPFeaqqqn5PhTYTgpSPTsqGlRrss9p0XJ+VPET8=';

async function testClusterMatching(cohortId, date) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 클러스터 매칭 테스트`);
  console.log(`   코호트: ${cohortId}`);
  console.log(`   날짜: ${date}`);
  console.log(`   모델: Gemini 3 Pro (thinkingLevel: high)`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = Date.now();

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET
      },
      body: JSON.stringify({
        cohortId,
        date
      })
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ 실패 (${elapsed}초):`, errorData);
      return null;
    }

    const result = await response.json();

    console.log(`✅ 성공 (${elapsed}초)`);
    console.log(`\n📊 결과 요약:`);
    console.log(`   총 참가자: ${result.totalParticipants}명`);
    console.log(`   클러스터 수: ${Object.keys(result.matching.clusters).length}개`);

    // 클러스터별 상세
    console.log(`\n📋 클러스터 상세:\n`);

    for (const [clusterId, cluster] of Object.entries(result.matching.clusters)) {
      const memberIds = cluster.memberIds || [];

      // 성별 분석을 위해 assignments에서 정보 추출
      console.log(`┌─ ${cluster.emoji || '📌'} "${cluster.name}"`);
      console.log(`│  테마: ${cluster.theme}`);
      console.log(`│  카테고리: ${cluster.category}`);
      console.log(`│  인원: ${memberIds.length}명`);
      console.log(`│  멤버: ${memberIds.join(', ')}`);
      console.log(`│  사유: ${cluster.reasoning}`);
      console.log(`└${'─'.repeat(50)}\n`);
    }

    return result;

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ 에러 (${elapsed}초):`, error.message);
    return null;
  }
}

// 테스트 실행
async function main() {
  // 4-2 코호트, 11/25 날짜로 테스트
  const result = await testClusterMatching('4-2', '2025-11-25');

  if (result) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`테스트 완료`);
    console.log(`${'='.repeat(60)}\n`);
  }
}

main().catch(console.error);
