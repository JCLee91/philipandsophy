import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProfileClientView from '@/components/profile/ProfileClientView';
import { fetchProfileInitialData } from '@/services/profile/data';
import type { ProfileTheme } from '@/constants/profile-themes';

export const dynamic = 'force-dynamic';

type ProfilePageProps = {
  params: Promise<{ participantId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function extractParamValue(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param;
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const participantId = decodeURIComponent(resolvedParams.participantId);
  const cohortId = extractParamValue(resolvedSearchParams.cohort) ?? null;
  const matchingDate = extractParamValue(resolvedSearchParams.matchingDate) ?? null;
  const themeParam = extractParamValue(resolvedSearchParams.theme) as ProfileTheme | undefined;

  const cookieStore = await cookies();
  const viewerId = cookieStore.get('pns-participant')?.value ?? null;

  if (!viewerId) {
    redirect('/app');
  }

  const initialData = await fetchProfileInitialData({
    participantId,
    cohortId,
    viewerId,
  });

  return (
    <ProfileClientView
      participantId={participantId}
      initialCohortId={cohortId}
      initialMatchingDate={matchingDate}
      initialTheme={themeParam}
      initialParticipant={initialData.participant}
      initialCohort={initialData.cohort}
      initialParticipantSubmissions={initialData.participantSubmissions}
      initialViewerSubmissions={initialData.viewerSubmissions}
    />
  );
}
