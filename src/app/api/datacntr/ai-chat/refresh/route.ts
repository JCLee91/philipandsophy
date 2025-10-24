import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const auth = await requireWebAppAdmin(req);
    if (auth.error) {
      return auth.error;
    }

    const db = getAdminDb();

    // 모든 데이터 조회
    const [cohortsSnap, participantsSnap, submissionsSnap, noticesSnap] = await Promise.all([
      db.collection(COLLECTIONS.COHORTS).get(),
      db.collection(COLLECTIONS.PARTICIPANTS).get(),
      db.collection(COLLECTIONS.READING_SUBMISSIONS).get(),
      db.collection(COLLECTIONS.NOTICES).get(),
    ]);

    // 전체 데이터를 JSON으로 변환
    const allData = {
      cohorts: cohortsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      participants: participantsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      submissions: submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      notices: noticesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    };

    // 데이터 컨텍스트 생성 (스키마 + 전체 데이터)
    const context = `
## DB 스키마 정보

참가자(participants):
- name: 이름
- cohortId: 소속 기수 ("1", "2" 등)
- isAdministrator: 관리자 여부 (true면 관리자, undefined면 일반 참가자)
- occupation: 직업
- currentBookTitle: 현재 읽는 책

독서 인증(reading_submissions):
- participantId: 제출한 참가자 ID
- bookTitle: 책 제목
- review: 간단 감상평
- submissionDate: 제출 날짜 (YYYY-MM-DD)

기수(cohorts):
- name: 기수명 ("1기", "2기")
- startDate, endDate: 프로그램 기간

## 전체 데이터 (JSON)

\`\`\`json
${JSON.stringify(allData, null, 2)}
\`\`\`

⚠️ 위 데이터는 캐시된 스냅샷입니다. 이 데이터를 기반으로 분석하고 답변하세요.
필요시 계산, 필터링, 정렬 등을 수행하세요.
`;

    console.log('✅ 데이터 컨텍스트 생성 완료');

    return NextResponse.json({
      context,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('데이터 새로고침 실패:', error);
    return NextResponse.json(
      { error: '데이터 로드 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
