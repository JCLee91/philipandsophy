import { NextRequest, NextResponse } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';

export async function GET(req: NextRequest) {
  console.log('🔄 [AI Chat Refresh] 시작');

  try {
    // 관리자 권한 확인
    console.log('🔐 [Step 1/6] 관리자 권한 확인 중...');
    const auth = await requireWebAppAdmin(req);
    if (auth.error) {
      console.error('❌ 권한 확인 실패');
      return auth.error;
    }
    console.log('✅ 권한 확인 완료');

    const { searchParams } = new URL(req.url);
    const cohortId = searchParams.get('cohortId');
    console.log(`📊 [Step 2/6] cohortId: ${cohortId}`);

    if (!cohortId) {
      console.error('❌ cohortId 없음');
      return NextResponse.json(
        { error: 'cohortId 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    console.log('🔥 [Step 3/6] Firebase Admin DB 연결 중...');
    const db = getAdminDb();
    console.log('✅ DB 연결 완료');

    // 선택한 기수의 데이터만 조회
    console.log('📥 [Step 4/6] Firestore 데이터 조회 시작...');
    console.time('Firestore Query');

    const [cohortDoc, participantsSnap, allSubmissionsSnap, noticesSnap] = await Promise.all([
      db.collection(COLLECTIONS.COHORTS).doc(cohortId).get(),
      db.collection(COLLECTIONS.PARTICIPANTS).where('cohortId', '==', cohortId).get(),
      db.collection(COLLECTIONS.READING_SUBMISSIONS).get(),
      db.collection(COLLECTIONS.NOTICES).where('cohortId', '==', cohortId).get(),
    ]);

    console.timeEnd('Firestore Query');
    console.log(`✅ 데이터 조회 완료:
  - Cohort: ${cohortDoc.exists ? '존재함' : '없음'}
  - Participants: ${participantsSnap.size}명
  - Total Submissions: ${allSubmissionsSnap.size}개
  - Notices: ${noticesSnap.size}개`);

    if (!cohortDoc.exists) {
      console.error(`❌ 기수 ${cohortId} 없음`);
      return NextResponse.json(
        { error: '기수를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    console.log('🔄 [Step 5/6] 데이터 필터링 및 변환 중...');

    // 참가자 ID 목록
    const participantIds = participantsSnap.docs.map(d => d.id);
    console.log(`📋 참가자 ID 목록 생성: ${participantIds.length}개`);

    // 해당 기수 참가자의 submissions만 필터링
    const submissionsSnap = {
      docs: allSubmissionsSnap.docs.filter(d => participantIds.includes(d.data().participantId))
    };
    console.log(`✅ Submissions 필터링 완료: ${submissionsSnap.docs.length}개`);

    // 전체 데이터를 JSON으로 변환
    console.log('📦 JSON 변환 시작...');
    const allData = {
      cohort: { id: cohortDoc.id, ...cohortDoc.data() },
      participants: participantsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      submissions: submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      notices: noticesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    };
    console.log('✅ JSON 변환 완료');

    // 데이터 컨텍스트 생성 (스키마 + 전체 데이터)
    console.log('📝 [Step 6/6] 컨텍스트 문자열 생성 중...');
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

    const contextSize = new Blob([context]).size;
    console.log(`✅ 컨텍스트 생성 완료 (크기: ${(contextSize / 1024).toFixed(2)} KB)`);

    console.log('🎉 [AI Chat Refresh] 성공!');
    return NextResponse.json({
      context,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('💥 [AI Chat Refresh] 오류 발생:', error);
    console.error('오류 상세:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: '데이터 로드 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
