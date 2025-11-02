import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ChatClientViewWithSuspense } from '@/components/chat/page/ChatClientView';
import { fetchChatInitialData } from '@/services/chat/data';
import { logger } from '@/lib/logger';
import { getFirebaseAdmin } from '@/lib/firebase/admin-init';
import type { Participant } from '@/types/database';
import { appRoutes } from '@/lib/navigation';

export const dynamic = 'force-dynamic';

type ChatPageProps = {
  searchParams: Promise<{
    cohort?: string;
  }>;
};

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const resolvedParams = await searchParams;
  const cookieStore = await cookies();
  const participantId = cookieStore.get('pns-participant')?.value ?? null;
  const cookieCohortId = cookieStore.get('pns-cohort')?.value ?? null;
  const searchParamCohortId = resolvedParams.cohort?.trim() || null;

  if (!participantId) {
    redirect('/app');
  }

  const { db } = getFirebaseAdmin();
  const participantSnapshot = await db.collection('participants').doc(participantId).get();

  if (!participantSnapshot.exists) {
    logger.warn('Participant cookie present but participant not found', { participantId });
    redirect('/app');
  }

  const participant = {
    id: participantSnapshot.id,
    ...participantSnapshot.data(),
  } as Participant;

  const isAdmin = Boolean(participant.isAdministrator || participant.isSuperAdmin);
  const fallbackCohortId = participant.cohortId ?? cookieCohortId ?? null;
  const cohortId = searchParamCohortId ?? fallbackCohortId;

  // ✅ cohortId가 없으면 /app으로 리다이렉트
  // (쿼리 파라미터 또는 참가자 정보에서 파생)
  if (!cohortId) {
    redirect('/app');
  }

  if (!isAdmin && participant.cohortId && participant.cohortId !== cohortId) {
    logger.warn('Non-admin participant attempted to access different cohort', {
      participantId,
      participantCohortId: participant.cohortId,
      requestedCohortId: cohortId,
    });
    redirect(appRoutes.chat(participant.cohortId));
  }

  // 관리자가 다른 기수를 조회하는 경우, 다운스트림 훅이 동일한 쿠키를 기대하므로
  // 서버 렌더링 단계에서 쿠키 기반 데이터를 그대로 전달한다.

  let initialData: Awaited<ReturnType<typeof fetchChatInitialData>> | null = null;

  try {
    initialData = await fetchChatInitialData(cohortId);
  } catch (error) {
    logger.error('Failed to fetch chat initial data', {
      participantId,
      cohortId,
      error,
    });
  }

  if (!initialData || !initialData.cohort) {
    redirect('/app');
  }

  return (
    <ChatClientViewWithSuspense
      initialCohortId={cohortId}
      initialCohort={initialData.cohort}
      initialNotices={initialData.notices}
    />
  );
}
