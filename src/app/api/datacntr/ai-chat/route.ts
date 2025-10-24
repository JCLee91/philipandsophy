import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { requireWebAppAdmin } from '@/lib/api-auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS, Cohort } from '@/types/database';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const auth = await requireWebAppAdmin(req);
    if (auth.error) {
      return auth.error;
    }

    const { messages } = await req.json();

    // Firestore 데이터 조회 함수들
    const db = getAdminDb();

    const getDataContext = async () => {
      const [cohortsSnap, participantsSnap, submissionsSnap, noticesSnap] = await Promise.all([
        db.collection(COLLECTIONS.COHORTS).get(),
        db.collection(COLLECTIONS.PARTICIPANTS).get(),
        db.collection(COLLECTIONS.READING_SUBMISSIONS).get(),
        db.collection(COLLECTIONS.NOTICES).get(),
      ]);

      const cohorts = cohortsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cohort));
      const participants = participantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const submissions = submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const notices = noticesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      return {
        cohorts,
        participants,
        submissions,
        notices,
        stats: {
          totalCohorts: cohorts.length,
          totalParticipants: participants.length,
          totalSubmissions: submissions.length,
          totalNotices: notices.length,
        },
      };
    };

    // 데이터 컨텍스트 가져오기
    const dataContext = await getDataContext();

    // System prompt
    const systemPrompt = `당신은 필립앤소피 독서 클럽의 데이터 분석 AI 어시스턴트입니다.

현재 데이터 개요:
- 총 기수: ${dataContext.stats.totalCohorts}개
- 총 참가자: ${dataContext.stats.totalParticipants}명
- 총 독서 인증: ${dataContext.stats.totalSubmissions}건
- 총 공지사항: ${dataContext.stats.totalNotices}개

기수 정보:
${dataContext.cohorts.map(c => `- ${c.name}: ${c.startDate} ~ ${c.endDate}`).join('\n')}

주요 역할:
1. 데이터 분석 및 통계 제공
2. 참가자 활동 현황 분석
3. 독서 인증 트렌드 분석
4. 질문에 대한 정확하고 간결한 답변

답변 시 주의사항:
- 한국어로 답변
- 정확한 숫자와 데이터 제공
- 간결하고 명확하게
- 필요시 요약 및 인사이트 제공`;

    // Vercel AI SDK 스트리밍 응답
    const result = streamText({
      model: openai('gpt-5-mini'),
      system: systemPrompt,
      messages,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error('AI Chat error:', error);
    return new Response(JSON.stringify({ error: 'AI 채팅 중 오류가 발생했습니다' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
