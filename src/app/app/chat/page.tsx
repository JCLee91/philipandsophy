import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ChatClientViewWithSuspense } from '@/components/chat/page/ChatClientView';
import { fetchChatInitialData } from '@/services/chat/data';
import { logger } from '@/lib/logger';

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
  const cohortId = resolvedParams.cohort ?? cookieCohortId;

  if (!participantId || !cohortId) {
    redirect('/app');
  }

  let initialData: Awaited<ReturnType<typeof fetchChatInitialData>> | null = null;

  try {
    initialData = await fetchChatInitialData(cohortId);
  } catch (error) {

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
