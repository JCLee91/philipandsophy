'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import DirectMessageDialog from '@/components/chat/DM/DirectMessageDialog';
import ProfileImageDialog from '@/components/ProfileImageDialog';
import ImageViewerDialog from '@/components/ImageViewerDialog';
import { ParticipantCard } from '@/components/ParticipantCard';
import UnifiedButton from '@/components/UnifiedButton';
import FooterActions from '@/components/FooterActions';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useParticipantsByCohort } from '@/hooks/use-participants';
import { useVerifiedToday } from '@/stores/verified-today';
import { appRoutes } from '@/lib/navigation';
import { getInitials, getFirstName } from '@/lib/utils';
import { SYSTEM_IDS } from '@/constants/app';
import type { Participant } from '@/types/database';
import { getResizedImageUrl, getOriginalImageUrl } from '@/lib/image-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check } from 'lucide-react';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';

function ParticipantsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');

  const { participant, isLoading: sessionLoading, logout } = useAuth();
  const currentUserId = participant?.id || '';
  const currentUserPhone = participant?.phoneNumber; // 전화번호로 본인 식별

  // ViewMode 사용: 설정에서 모드를 전환하면 즉시 반영
  const { viewMode } = useViewMode();
  const isAdmin = viewMode === 'admin';

  const { data: participants = [], isLoading: participantsLoading } = useParticipantsByCohort(cohortId || undefined);
  const { data: verifiedIds } = useVerifiedToday();

  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [dmTarget, setDmTarget] = useState<Participant | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string>('');

  // 참가자 정렬: admin 계정 + 고스트 제외, 현재 사용자 최상단, 나머지는 원래 순서
  const sortedParticipants = useMemo(() => {
    return [...participants]
      .filter((p) => p.id !== SYSTEM_IDS.ADMIN && !p.isGhost) // admin 계정 + 고스트 제외
      .sort((a, b) => {
        // 현재 사용자를 맨 위로 (전화번호 또는 ID로 매칭)
        const isAMe = a.id === currentUserId || (currentUserPhone && a.phoneNumber === currentUserPhone);
        const isBMe = b.id === currentUserId || (currentUserPhone && b.phoneNumber === currentUserPhone);

        if (isAMe) return -1;
        if (isBMe) return 1;

        // 나머지는 원래 순서 유지
        return 0;
      });
  }, [participants, currentUserId, currentUserPhone]);

  const handleProfileBookClick = (participant: Participant) => {
    // cohortId는 URL에서 가져오거나, 없으면 참가자의 cohortId 사용
    const targetCohortId = cohortId || participant.cohortId;
    if (!targetCohortId) {

      return;
    }
    router.push(appRoutes.profile(participant.id, targetCohortId));
  };

  const handleDMClick = (participant: Participant) => {
    setDmTarget(participant);
    setDmDialogOpen(true);
  };

  const handleImageClick = (participant: Participant) => {
    // 원본 이미지는 faceImage를 우선 사용하고, 없으면 profileImage를 사용
    const imageUrl = participant.faceImage || participant.profileImage;
    if (imageUrl) {
      setImageViewerUrl(imageUrl);
      setImageViewerOpen(true);
    }
  };

  // 무한 리다이렉트 방지: 리다이렉트 플래그 추적
  const hasRedirectedRef = useRef(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;

    // 이미 리다이렉트한 경우 중복 방지
    if (hasRedirectedRef.current) return;

    if (!participant || !cohortId) {
      hasRedirectedRef.current = true;
      setIsRedirecting(true);

      router.replace('/app');
    }
    // router는 Next.js useRouter에서 반환되는 안정적인 객체이므로 의존성 배열에 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, participant, cohortId]);

  // 리다이렉트 중에는 빈 화면 (깜빡임 방지)
  if (isRedirecting) {
    return null;
  }

  if (sessionLoading || participantsLoading || !participant || !cohortId) {
    return <LoadingSpinner message="참가자 목록을 불러오는 중입니다" />;
  }

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden bg-background">
        <TopBar onBack={() => router.back()} title={`참가자 목록 (${sortedParticipants.length})`} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-2 px-6 py-4">
            {sortedParticipants.map((p) => {
              // 본인 식별: ID 또는 전화번호로 매칭 (1기→3기 재참여 대응)
              const isMe = p.id === currentUserId || (currentUserPhone && p.phoneNumber === currentUserPhone);
              const verified = verifiedIds?.has(p.id) ?? false;

              if (isMe) {
                const initials = getInitials(p.name);
                return (
                  <div key={p.id} className="rounded-lg border bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div 
                        className="relative cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageClick(p);
                        }}
                      >
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          {getResizedImageUrl(p.profileImageCircle || p.profileImage) !== (p.profileImageCircle || p.profileImage) && (
                            <AvatarImage
                              src={getResizedImageUrl(p.profileImageCircle || p.profileImage)}
                              alt={p.name}
                              className="object-cover"
                            />
                          )}
                          <AvatarImage
                            src={p.profileImageCircle || p.profileImage}
                            alt={p.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-md">
                            <Check className="h-3 w-3 text-white stroke-[3]" aria-label="오늘 독서 인증 완료" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{getFirstName(p.name)}</span>
                        <span className="text-xs text-muted-foreground">(나)</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <UnifiedButton variant="outline" onClick={() => setSelectedParticipant(p)}>
                        간단 프로필 보기
                      </UnifiedButton>
                      <UnifiedButton onClick={() => handleProfileBookClick(p)}>
                        프로필북 보기
                      </UnifiedButton>
                    </div>
                  </div>
                );
              }

              return (
                <ParticipantCard
                  key={p.id}
                  participant={p}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  showUnreadBadge={isAdmin}
                  onDMClick={handleDMClick}
                  onProfileClick={setSelectedParticipant}
                  onProfileBookClick={handleProfileBookClick}
                  onImageClick={handleImageClick}
                />
              );
            })}
          </div>
        </main>

        <FooterActions maxWidth="xl">
          <UnifiedButton
            variant="destructive"
            onClick={async () => {
              await logout();
              // Next.js 캐시를 무시하고 완전히 새로 로드
              window.location.href = '/app';
            }}
            icon={<LogOut className="h-5 w-5" />}
          >
            로그아웃
          </UnifiedButton>
        </FooterActions>

        <DirectMessageDialog
          open={dmDialogOpen}
          onOpenChange={setDmDialogOpen}
          currentUserId={currentUserId}
          currentUser={participant}
          otherUser={dmTarget}
        />

        <ProfileImageDialog
          participant={selectedParticipant}
          open={!!selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />

        <ImageViewerDialog
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
          imageUrl={imageViewerUrl}
        />
      </div>
    </PageTransition>
  );
}

export default function ParticipantsPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="참가자 목록을 불러오는 중입니다" />}>
      <ParticipantsPageContent />
    </Suspense>
  );
}
