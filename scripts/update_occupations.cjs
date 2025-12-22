/**
 * 참가자 직업(occupation) 필드 업데이트 스크립트
 *
 * 사용법: node scripts/update_occupations.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const OCCUPATION_DATA = {
  '김효선': '정부부처 사무관',
  '최준영': '증권사 IT 개발',
  '박건혁': '증권사 인사팀',
  '조형래': '컨설팅펌 전략컨설팅',
  '김단비': '치위생사',
  '신가인': '이차전지 기업 연구원',
  '김다미': '항공사 사무직',
  '이지수': '광고 회사 마케팅',
  '김성은': 'F&B 기업 마케팅',
  '김영웅': '공제회 정보보안팀',
  '하영진': '스타트업 대표',
  '백화현': '회계법인 회계사',
  '최서인': 'IT 기업 PM',
  '김한슬': '승강기 기업 유지보수',
  '왕영래': '부동산 기업 전략/자문/중개',
  '이연지': '마케팅 대행사 사업기획',
  '강경연': '투자 기업 재무',
  '서민정': '제약 기업 임상시험 모니터',
  '최혜영': '바이오 기업 해외영업',
  '성유나': '통신업 IT 서비스 기획',
  '김동희': '시장조사 기업 마케팅 연구원',
  '한유진': '공무원',
  '권예지': '마케팅 에이전시 마케터',
  '장현아': '에너지 기업 트레이딩',
  '오유빈': '대학교 시간 강사 / 연구원',
  '박기범': '바이오 기업 전략기획',
  '신선한': '온라인 편집샵 운영',
  '김솔림': '의료기기 기업 PM',
  '이윤석': '스타트업 개발/영업관리',
  '김환희': '스타트업 사업개발',
  '강수범': 'AI 개발',
  '허빈': '스타트업 대표',
  '정유상': '스타트업 대표',
  '안백산': '스타트업 코파운더',
  '문인욱': '스타트업 대표',
  '신동순': 'IT 스타트업 대표',
};

async function main() {
  const participantsRef = db.collection('participants');

  console.log('🔍 참가자 직업 업데이트 시작...\n');

  let updated = 0;
  let notFound = 0;
  let alreadySet = 0;

  for (const [name, occupation] of Object.entries(OCCUPATION_DATA)) {
    // 이름으로 참가자 찾기
    const snapshot = await participantsRef.where('name', '==', name).get();

    if (snapshot.empty) {
      console.log(`❌ 찾을 수 없음: ${name}`);
      notFound++;
      continue;
    }

    // 동명이인이 있을 수 있으므로 모든 문서 업데이트
    for (const doc of snapshot.docs) {
      const data = doc.data();

      if (data.occupation === occupation) {
        console.log(`⏭️  이미 설정됨: ${name} (${doc.id})`);
        alreadySet++;
        continue;
      }

      await doc.ref.update({ occupation });
      console.log(`✅ 업데이트: ${name} → ${occupation} (${doc.id})`);
      updated++;
    }
  }

  console.log('\n========================================');
  console.log(`✅ 업데이트: ${updated}명`);
  console.log(`⏭️  이미 설정: ${alreadySet}명`);
  console.log(`❌ 찾을 수 없음: ${notFound}명`);
  console.log('========================================');
}

main().catch(console.error);
