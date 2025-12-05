'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/use-access-control';
import { useProfileBookAccess, isProfileBookLocked } from '@/hooks/use-profile-book-access';
import { useParticipantSubmissionsRealtime } from '@/hooks/use-submissions';
import { useCohort } from '@/hooks/use-cohorts';
import { useYesterdayVerifiedParticipants } from '@/hooks/use-yesterday-verified-participants';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { findLatestMatchingForParticipant } from '@/lib/matching-utils';
import { getAssignedProfiles } from '@/lib/matching-compat';
import { getSubmissionDate, canViewAllProfiles, canViewAllProfilesWithoutAuth, shouldShowAllYesterdayVerified } from '@/lib/date-utils';
import { appRoutes } from '@/lib/navigation';
import type { Participant } from '@/types/database';
import type { FeaturedParticipant } from '@/types/today-library';

export function useTodayLibraryV2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');

  const { participant, isLoading: sessionLoading } = useAuth();
  const currentUserId = participant?.id;
  const { isSuperAdmin, isLocked } = useAccessControl();

  const profileBookAccess = useProfileBookAccess(cohortId || undefined);
  const { data: cohort, isLoading: cohortLoading } = useCohort(cohortId || undefined);
  const { toast } = useToast();

  const todayDate = getSubmissionDate();
  const { data: viewerSubmissions = [], isLoading: viewerSubmissionLoading } = useParticipantSubmissionsRealtime(currentUserId);

  const viewerSubmissionDates = useMemo(
    () => new Set(viewerSubmissions.map((submission) => submission.submissionDate)),
    [viewerSubmissions]
  );
  const viewerHasSubmittedToday = viewerSubmissionDates.has(todayDate);
  const preferredMatchingDate = viewerHasSubmittedToday ? todayDate : undefined;

  // 매칭 데이터 조회
  const matchingLookupWithinAccess = useMemo(() => {
    if (!cohort?.dailyFeaturedParticipants || !currentUserId) return null;
    return findLatestMatchingForParticipant(
      cohort.dailyFeaturedParticipants,
      currentUserId,
      { preferredDate: preferredMatchingDate }
    );
  }, [cohort?.dailyFeaturedParticipants, currentUserId, preferredMatchingDate]);

  const matchingLookup = useMemo(() => {
    if (matchingLookupWithinAccess) return matchingLookupWithinAccess;
    if (!cohort?.dailyFeaturedParticipants || !currentUserId) return null;
    return findLatestMatchingForParticipant(cohort.dailyFeaturedParticipants, currentUserId, {
      preferredDate: preferredMatchingDate,
    });
  }, [matchingLookupWithinAccess, cohort?.dailyFeaturedParticipants, currentUserId, preferredMatchingDate]);

  const activeMatchingDate = matchingLookup?.date ?? null;
  const assignments = matchingLookup?.matching.assignments ?? {};
  const matchingVersion = matchingLookup?.matching.matchingVersion;

  const userAssignment = currentUserId && assignments ? assignments[currentUserId] ?? null : null;
  const assignedProfileIds = getAssignedProfiles(userAssignment);
  const isRandomMatching = matchingVersion === 'random';

  const allFeaturedIds = useMemo(() => {
    if (isRandomMatching) {
      if (isLocked && !isSuperAdmin) return assignedProfileIds.slice(0, 20);
      return assignedProfileIds;
    }
    return assignedProfileIds;
  }, [isRandomMatching, isLocked, isSuperAdmin, assignedProfileIds]);

  // 어제 인증한 참가자 목록
  const { data: yesterdayVerifiedIds, isLoading: yesterdayVerifiedLoading } = useYesterdayVerifiedParticipants(cohortId || undefined);

  // 프로필 공개 조건
  const isFinalDay = cohort ? canViewAllProfiles(cohort) : false;
  const showAllProfilesWithoutAuth = cohort ? canViewAllProfilesWithoutAuth(cohort) : false;
  const isUnlockDayOrAfter = cohort ? shouldShowAllYesterdayVerified(cohort) : false;
  const isProfileUnlockMode = isUnlockDayOrAfter && !isFinalDay;
  const showAllProfiles = isSuperAdmin || isFinalDay || showAllProfilesWithoutAuth || (isProfileUnlockMode && yesterdayVerifiedIds && yesterdayVerifiedIds.size > 0);

  const yesterdayIdsArray = yesterdayVerifiedIds ? Array.from(yesterdayVerifiedIds).sort() : [];
  const yesterdayIdsKey = yesterdayIdsArray.join(',');

  // 참가자 데이터 쿼리
  const allFeaturedIdsKey = allFeaturedIds.join(',');
  const { data: featuredParticipants = [], isLoading: participantsLoading } = useQuery<FeaturedParticipant[]>({
    queryKey: showAllProfiles
      ? ['all-participants-final-day', cohortId, currentUserId, todayDate, yesterdayIdsKey]
      : ['featured-participants-v3', activeMatchingDate, allFeaturedIdsKey],
    queryFn: async () => {
      const db = getDb();
      const participantsRef = collection(db, 'participants');
      let participants: Participant[] = [];

      if (showAllProfiles) {
        if (isFinalDay || isSuperAdmin || showAllProfilesWithoutAuth) {
          const q = query(participantsRef, where('cohortId', '==', cohortId));
          const allSnapshot = await getDocs(q);
          participants = allSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Participant[];
          participants = participants.filter((p) => p.id !== currentUserId && !p.isSuperAdmin && !p.isAdministrator && !p.isGhost);
        } else {
          const yesterdayIds = Array.from(yesterdayVerifiedIds || []).filter(id => id !== currentUserId);
          if (yesterdayIds.length === 0) return [];

          const chunks: Participant[] = [];
          for (let i = 0; i < yesterdayIds.length; i += 10) {
            const chunk = yesterdayIds.slice(i, i + 10);
            const q = query(participantsRef, where('__name__', 'in', chunk));
            const snapshot = await getDocs(q);
            chunks.push(...snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Participant[]);
          }
          participants = chunks.filter(p => !p.isGhost);
        }
      } else {
        if (allFeaturedIds.length === 0) return [];

        const chunks: Participant[] = [];
        for (let i = 0; i < allFeaturedIds.length; i += 10) {
          const chunk = allFeaturedIds.slice(i, i + 10);
          const q = query(participantsRef, where('__name__', 'in', chunk));
          const snapshot = await getDocs(q);
          chunks.push(...snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Participant[]);
        }
        participants = chunks;

        if (isRandomMatching) {
          const orderMap = new Map(allFeaturedIds.map((id, index) => [id, index]));
          participants.sort((a, b) => {
            const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return indexA - indexB;
          });
        }
      }

      return participants.map((participant) => {
        const inferCircleUrl = (url?: string) => {
          if (!url) return undefined;
          const [base, queryStr] = url.split('?');
          if (!base.includes('_full')) return undefined;
          const circleBase = base.replace('_full', '_circle');
          return queryStr ? `${circleBase}?${queryStr}` : circleBase;
        };

        const circleImage = participant.profileImageCircle || inferCircleUrl(participant.profileImage);
        const derivedTheme = participant.gender === 'female' ? 'opposite' : 'similar';

        return {
          ...participant,
          profileImage: circleImage || participant.profileImage,
          profileImageCircle: circleImage,
          theme: derivedTheme,
        };
      });
    },
    enabled: showAllProfiles
      ? !!cohort && !!currentUserId && !yesterdayVerifiedLoading
      : allFeaturedIds.length > 0 && !!activeMatchingDate,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // 세션 검증 effect
  useEffect(() => {
    if (!sessionLoading && !cohortLoading) {
      if (!participant) {
        toast({ title: '로그인이 필요합니다', description: '접근 코드를 입력해주세요' });
        router.replace('/app');
        return;
      }
      if (!cohortId) {
        toast({ title: '잘못된 접근입니다', description: '올바른 기수 정보가 필요합니다' });
        router.replace('/app');
        return;
      }
      if (cohortId && !cohort) {
        toast({ title: '존재하지 않는 기수입니다', description: '올바른 접근 코드로 다시 입장해주세요' });
        router.replace('/app');
        return;
      }
    }
  }, [sessionLoading, cohortLoading, participant, cohortId, cohort, router, toast]);

  // 알림 제거 effect
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_NOTIFICATIONS_BY_TYPE',
        notificationType: 'matching',
      });
    }
  }, []);

  // 계산된 값들
  const maleParticipants = featuredParticipants.filter((p) => !p.gender || p.gender === 'male');
  const femaleParticipants = featuredParticipants.filter((p) => p.gender === 'female');

  const availableIds = !isRandomMatching
    ? featuredParticipants.map((p) => p.id)
    : isLocked && !isSuperAdmin
      ? assignedProfileIds.slice(0, Math.min(20, assignedProfileIds.length))
      : assignedProfileIds;

  const unlockedLimit = isRandomMatching && isLocked && !isSuperAdmin
    ? Math.min(profileBookAccess.unlockedProfileBooks, availableIds.length)
    : availableIds.length;

  const unlockedIdsSet = new Set(availableIds.slice(0, unlockedLimit));

  const totalCount = isRandomMatching ? assignedProfileIds.length : featuredParticipants.length;
  const unlockedCount = unlockedIdsSet.size;
  const lockedCount = Math.max(totalCount - unlockedCount, 0);
  const shouldShowLockedCards = isRandomMatching && isLocked && lockedCount > 0;

  const visibleMale = maleParticipants.filter((p) => unlockedIdsSet.has(p.id));
  const visibleFemale = femaleParticipants.filter((p) => unlockedIdsSet.has(p.id));
  const maleLockedSlots = shouldShowLockedCards ? Math.max(maleParticipants.length - visibleMale.length, 0) : 0;
  const femaleLockedSlots = shouldShowLockedCards ? Math.max(femaleParticipants.length - visibleFemale.length, 0) : 0;

  const visibleMaleInAllMode = showAllProfiles && isLocked && !isSuperAdmin && !showAllProfilesWithoutAuth
    ? maleParticipants.slice(0, 1) : maleParticipants;
  const visibleFemaleInAllMode = showAllProfiles && isLocked && !isSuperAdmin && !showAllProfilesWithoutAuth
    ? femaleParticipants.slice(0, 1) : femaleParticipants;

  // 프로필 클릭 핸들러
  const handleProfileClick = (participantId: string, theme: 'similar' | 'opposite', cardIndex?: number) => {
    if (showAllProfilesWithoutAuth) {
      const matchingDate = getSubmissionDate();
      router.push(`${appRoutes.profile(participantId, cohortId!, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`);
      return;
    }

    if (isRandomMatching && cardIndex !== undefined) {
      const isCardLocked = isProfileBookLocked(cardIndex, profileBookAccess);
      if (isCardLocked) {
        const totalAssigned = assignedProfileIds.length;
        const additionalProfilesToUnlock = Math.max(totalAssigned - 2, 0);
        toast({
          title: '프로필 잠김 🔒',
          description: `오늘의 독서를 인증하면 추가로 ${additionalProfilesToUnlock}개의 프로필북을 볼 수 있어요. (총 ${totalAssigned}개)`,
        });
        return;
      }
      const matchingDate = activeMatchingDate || getSubmissionDate();
      router.push(`${appRoutes.profile(participantId, cohortId!, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`);
      return;
    }

    if (isProfileUnlockMode) {
      const matchingDate = getSubmissionDate();
      router.push(`${appRoutes.profile(participantId, cohortId!, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`);
      return;
    }

    if (isFinalDay && !showAllProfilesWithoutAuth) {
      const isFreeProfile = visibleMaleInAllMode.some(p => p.id === participantId) ||
        visibleFemaleInAllMode.some(p => p.id === participantId);

      if (isLocked && !isFreeProfile) {
        toast({
          title: '프로필 잠김 🔒',
          description: '오늘의 독서를 인증하면 모든 프로필을 확인할 수 있어요 (마지막 날 특별 이벤트!)',
        });
        return;
      }

      const matchingDate = getSubmissionDate();
      let profileUrl = `${appRoutes.profile(participantId, cohortId!, theme)}&matchingDate=${encodeURIComponent(matchingDate)}`;
      if (isFreeProfile) profileUrl += '&freeAccess=true';
      router.push(profileUrl);
      return;
    }

    if (isLocked) {
      toast({ title: '프로필 잠김 🔒', description: '오늘의 독서를 인증하면 프로필을 확인할 수 있어요' });
      return;
    }

    if (!activeMatchingDate) {
      toast({ title: '프로필북 정보를 불러올 수 없습니다', description: '잠시 후 다시 시도해주세요.' });
      return;
    }

    router.push(`${appRoutes.profile(participantId, cohortId!, theme)}&matchingDate=${encodeURIComponent(activeMatchingDate)}`);
  };

  const handleLockedCardClick = (isFinalDayMode: boolean) => {
    toast({
      title: '프로필 잠김 🔒',
      description: isFinalDayMode
        ? '오늘의 독서를 인증하면 모든 프로필을 확인할 수 있어요 (마지막 날 특별 이벤트!)'
        : '오늘의 독서를 인증하면 모든 프로필을 확인할 수 있어요',
    });
  };

  const isLoading = sessionLoading || cohortLoading || participantsLoading || viewerSubmissionLoading || yesterdayVerifiedLoading;
  const isValidSession = !!participant && !!cohort && !!cohortId;

  return {
    // 상태
    cohortId,
    currentUserId,
    isLoading,
    isValidSession,
    
    // 접근 제어
    isSuperAdmin,
    isLocked,
    isFinalDay,
    showAllProfiles,
    showAllProfilesWithoutAuth,
    isProfileUnlockMode,
    isRandomMatching,
    matchingVersion,
    
    // 참가자 데이터
    allFeaturedIds,
    maleParticipants,
    femaleParticipants,
    visibleMale,
    visibleFemale,
    visibleMaleInAllMode,
    visibleFemaleInAllMode,
    assignedProfileIds,
    
    // 카운트
    totalCount,
    unlockedCount,
    shouldShowLockedCards,
    maleLockedSlots,
    femaleLockedSlots,
    
    // 핸들러
    handleProfileClick,
    handleLockedCardClick,
    router,
    toast,
  };
}
