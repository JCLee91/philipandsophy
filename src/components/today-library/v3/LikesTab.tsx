'use client';

import { useMemo, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useLikes } from '@/features/likes/hooks/use-likes';
import { getResizedImageUrl } from '@/lib/image-utils';
import { normalizeTextForPreview } from '@/lib/text-utils';
import { getFirstName } from '@/lib/utils';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LikeData } from '@/features/likes/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Participant, ReadingSubmission } from '@/types/database';

// 가치관 답변 모달 데이터 타입
interface AnswerModalData {
  participant: Participant;
  submission: ReadingSubmission;
}

// 좋아요 준 사람 목록 모달 데이터 타입
interface LikersModalData {
  title: string;
  participants: Participant[];
}

interface LikesTabProps {
  currentUserId: string;
  allParticipants: Participant[];
  onProfileClick: (participantId: string) => void;
  cohortId: string;
}

// 랭킹 카드 컴포넌트 (Top 3)
function RankingCard({
  title,
  rankings,
  onProfileClick,
  emptyMessage,
}: {
  title: string;
  rankings: Array<{ participantId: string; name: string; profileImage?: string; count: number }>;
  onProfileClick: (id: string) => void;
  emptyMessage: string;
}) {
  if (rankings.length === 0) {
    return (
      <div className="bg-white rounded-[12px] p-6 shadow-xs flex flex-col items-center justify-center min-h-[160px] text-center">
        <p className="text-[13px] font-bold text-[#333D4B] mb-2">{title}</p>
        <p className="text-[12px] text-[#8B95A1]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[12px] p-5 shadow-xs flex flex-col h-full relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Heart size={80} fill="currentColor" className="text-[#FF4B4B]" />
      </div>

      <p className="text-[14px] font-bold text-[#333D4B] mb-4 relative z-10">{title}</p>

      <div className="flex justify-around items-end gap-2 flex-1 relative z-10">
        {rankings.slice(0, 3).map((item, idx) => (
          <button
            key={item.participantId}
            onClick={() => onProfileClick(item.participantId)}
            className="flex flex-col items-center gap-1.5 w-[60px]"
          >
            <div className="relative">
              <div className={cn(
                "relative w-12 h-12 rounded-full overflow-hidden border-2",
                idx === 0 ? "border-[#FFD700] w-14 h-14 shadow-md" :
                idx === 1 ? "border-[#C0C0C0]" : "border-[#CD7F32]"
              )}>
                <Image
                  src={getResizedImageUrl(item.profileImage) || '/image/default-profile.svg'}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className={cn(
                "absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shadow-sm",
                idx === 0 ? "bg-[#FFD700]" :
                idx === 1 ? "bg-[#C0C0C0]" : "bg-[#CD7F32]"
              )}>
                {idx + 1}
              </div>
            </div>
            <span className="text-[11px] text-[#333D4B] font-medium truncate w-full text-center">
              {getFirstName(item.name)}
            </span>
            <span className="text-[10px] text-[#FF4B4B] font-bold bg-[#FFF0F0] px-1.5 py-0.5 rounded-[4px]">
              {item.count}개
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AvatarRow({
  participants,
  max = 5,
}: {
  participants: Participant[];
  max?: number;
}) {
  const unique = useMemo(() => {
    const seen = new Set<string>();
    const result: Participant[] = [];
    for (const participant of participants) {
      if (!participant?.id) continue;
      if (seen.has(participant.id)) continue;
      seen.add(participant.id);
      result.push(participant);
    }
    return result;
  }, [participants]);

  const visible = unique.slice(0, max);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex -space-x-2">
        {visible.map(p => (
          <div
            key={p.id}
            className="w-7 h-7 rounded-full overflow-hidden border-2 border-white relative bg-[#F2F4F6]"
            title={p.name}
          >
            <Image
              src={getResizedImageUrl(p.profileImageCircle || p.profileImage) || '/image/default-profile.svg'}
              alt={p.name}
              fill
              className="object-cover"
              sizes="28px"
            />
          </div>
        ))}
      </div>
      <div className="text-[12px] text-[#6B7684] truncate">
        {unique.length > 0 ? (
          <>
            <span className="font-medium text-[#333D4B]">{getFirstName(unique[0].name)}</span>
            {unique.length > 1 && (
              <span className="ml-1">외 {unique.length - 1}명</span>
            )}
          </>
        ) : (
          <span>좋아요</span>
        )}
      </div>
    </div>
  );
}

function ReceivedLikeCard({
  title,
  subtitle,
  preview,
  likeCount,
  submission,
  contentParticipant,
  likers,
  onOpenLikers,
  onOpenContent,
}: {
  title: string;
  subtitle?: string;
  preview: string;
  likeCount: number;
  submission?: ReadingSubmission;
  contentParticipant?: Participant;
  likers: Participant[];
  onOpenLikers: () => void;
  onOpenContent: () => void;
}) {
  const isMissingContent = !submission || !contentParticipant;

  return (
    <div
      className={cn(
        "bg-white rounded-[12px] p-5 border border-[#F2F4F6] transition-colors",
        isMissingContent ? "opacity-60" : "hover:border-[#E5E8EB]"
      )}
    >
      <button
        type="button"
        onClick={onOpenContent}
        className="w-full text-left"
        disabled={isMissingContent}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[12px] font-bold text-[#333D4B] truncate">{title}</span>
              <span className="text-[11px] text-[#FF4B4B] font-bold shrink-0">{likeCount}개</span>
            </div>
            {subtitle && (
              <p className="text-[12px] text-[#8B95A1] mt-1 truncate">{subtitle}</p>
            )}
          </div>
          <Heart size={14} fill="#FF4B4B" className="text-[#FF4B4B] shrink-0 mt-0.5" />
        </div>

        <p className="text-[14px] text-[#333D4B] leading-normal mt-3 truncate">
          {isMissingContent ? '삭제되었거나 불러올 수 없는 글입니다.' : normalizeTextForPreview(preview)}
        </p>
      </button>

      <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-[#F2F4F6]">
        <AvatarRow participants={likers} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLikers();
          }}
          className="shrink-0 text-[12px] font-bold text-[#4E5968] bg-[#F2F4F6] hover:bg-[#E5E8EB] px-3 py-1.5 rounded-[8px] transition-colors"
          disabled={likers.length === 0}
        >
          보기
        </button>
      </div>
    </div>
  );
}

// 스크랩 카드 컴포넌트
function ScrapCard({
  like,
  submission,
  participant,
  contentParticipant,
  onProfileClick,
  onReviewClick,
  onAnswerClick,
}: {
  like: LikeData;
  submission?: ReadingSubmission;
  participant?: Participant;
  contentParticipant?: Participant;
  onProfileClick: (id: string) => void;
  onReviewClick: (id: string, submission?: ReadingSubmission) => void;
  onAnswerClick: (participant: Participant, submission: ReadingSubmission) => void;
}) {
  if (!participant || !submission) return null;

  const content = like.targetType === 'review'
    ? submission.review
    : submission.dailyAnswer;

  const contentLabel = like.targetType === 'review' ? '감상평' : '가치관 답변';

  // 클릭 핸들러: 감상평은 페이지 이동, 가치관 답변은 모달
  const handleContentClick = () => {
    if (like.targetType === 'review') {
      onReviewClick(submission.participantId, submission);
    } else {
      onAnswerClick(contentParticipant ?? participant, submission);
    }
  };

  return (
    <div className="flex gap-3 border-b border-[#F2F4F6] py-4 first:pt-0 items-start">
      {/* Left: Avatar & Name */}
      <div className="flex flex-col items-center gap-1 shrink-0 w-[40px]">
        <div
          className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-100 cursor-pointer"
          onClick={() => onProfileClick(participant.id)}
        >
          <Image
            src={getResizedImageUrl(participant.profileImageCircle || participant.profileImage) || '/image/default-profile.svg'}
            alt={participant.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
        <span className="text-[11px] text-[#8B95A1] text-center w-full truncate">{participant.name}</span>
      </div>

      {/* Right: Content */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Top Row: Book Title or Question + Heart Icon */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="cursor-pointer flex-1 min-w-0"
            onClick={handleContentClick}
          >
            {like.targetType === 'review' && submission.bookTitle ? (
              <div className="bg-[#F2F4F6] px-2 py-1 rounded-[4px] inline-block max-w-full">
                <h3 className="text-[12px] font-bold text-[#4E5968] truncate">
                  {submission.bookTitle}
                </h3>
              </div>
            ) : like.targetType === 'answer' && submission.dailyQuestion ? (
              <div className="bg-[#FFF8E1] px-2 py-1 rounded-[4px] inline-block max-w-full">
                <h3 className="text-[12px] font-bold text-[#8B6914] truncate">
                  {submission.dailyQuestion}
                </h3>
              </div>
            ) : (
              <span className="text-[12px] text-[#8B95A1]">{contentLabel}</span>
            )}
          </div>
          <Heart size={14} fill="#FF4B4B" className="text-[#FF4B4B] shrink-0 mt-1" />
        </div>

        {/* Content Text */}
        <div
          className="cursor-pointer"
          onClick={handleContentClick}
        >
          <p className="text-[14px] text-[#333D4B] leading-normal truncate max-w-[320px]">
            {content ? normalizeTextForPreview(content) : `작성된 ${contentLabel}이 없습니다.`}
          </p>
        </div>

        {/* Date */}
        <span className="text-[11px] text-[#ADB5BD]">
          {new Date(like.createdAt?.toDate?.() || like.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

// 좋아요 목록 섹션 컴포넌트 (감상평/가치관 답변 분리)
function LikeListSection({
  title,
  likes,
  submissionsMap,
  participantMap,
  participantKey,
  onProfileClick,
  onReviewClick,
  onAnswerClick,
  emptyMessage,
  accentColor,
}: {
  title: string;
  likes: LikeData[];
  submissionsMap: Map<string, ReadingSubmission>;
  participantMap: Map<string, Participant>;
  participantKey: 'userId' | 'targetUserId';
  onProfileClick: (id: string) => void;
  onReviewClick: (id: string, submission?: ReadingSubmission) => void;
  onAnswerClick: (participant: Participant, submission: ReadingSubmission) => void;
  emptyMessage: string;
  accentColor: string;
}) {
  return (
    <div className="bg-white rounded-[12px] p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("w-2 h-2 rounded-full", accentColor)} />
        <p className="text-[13px] font-bold text-[#333D4B]">{title}</p>
        <span className="text-[12px] text-[#8B95A1]">{likes.length}개</span>
      </div>
      {likes.length > 0 ? (
        <div className="flex flex-col">
          {likes.map(like => {
            const submission = submissionsMap.get(like.targetId);
            const contentParticipant = submission ? participantMap.get(submission.participantId) : undefined;

            return (
              <ScrapCard
                key={like.id}
                like={like}
                submission={submission}
                participant={participantMap.get(like[participantKey])}
                contentParticipant={contentParticipant}
                onProfileClick={onProfileClick}
                onReviewClick={onReviewClick}
                onAnswerClick={onAnswerClick}
              />
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-[#8B95A1] text-[13px]">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

export default function LikesTab({
  currentUserId,
  allParticipants,
  onProfileClick,
  cohortId,
}: LikesTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { myLikes, receivedLikes, submissionsMap, isLoading } = useLikes(currentUserId);

  // 가치관 답변 모달 상태
  const [answerModalData, setAnswerModalData] = useState<AnswerModalData | null>(null);
  const [likersModalData, setLikersModalData] = useState<LikersModalData | null>(null);

  // URL 쿼리 파라미터로 서브탭 상태 관리 (뒤로가기 시 유지)
  const likesTabParam = searchParams.get('likesTab');
  const activeTab: 'received' | 'sent' = likesTabParam === 'sent' ? 'sent' : 'received';

  // 서브탭 변경 시 URL 업데이트
  const setActiveTab = useCallback((tab: 'received' | 'sent') => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'received') {
      params.delete('likesTab');
    } else {
      params.set('likesTab', tab);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [router, searchParams]);

  // 감상평 클릭 핸들러 (좋아요 탭에서는 isLocked 체크 없이 직접 이동)
  const handleReviewClick = useCallback((participantId: string, submission?: ReadingSubmission) => {
    const date = submission?.submissionDate || searchParams.get('matchingDate') || '';
    router.push(`/app/chat/today-library/review/${encodeURIComponent(participantId)}?date=${date}&cohort=${cohortId}`);
  }, [router, cohortId, searchParams]);

  // 가치관 답변 클릭 핸들러
  const handleAnswerClick = useCallback((participant: Participant, submission: ReadingSubmission) => {
    setAnswerModalData({ participant, submission });
  }, []);

  // Participant Map
  const participantMap = useMemo(() => {
    return new Map(allParticipants.map(p => [p.id, p]));
  }, [allParticipants]);

  // 감상평과 가치관 답변 분리
  const receivedReviewLikes = useMemo(
    () => receivedLikes.filter(like => like.targetType === 'review'),
    [receivedLikes]
  );
  const receivedAnswerLikes = useMemo(
    () => receivedLikes.filter(like => like.targetType === 'answer'),
    [receivedLikes]
  );
  const sentReviewLikes = useMemo(
    () => myLikes.filter(like => like.targetType === 'review'),
    [myLikes]
  );
  const sentAnswerLikes = useMemo(
    () => myLikes.filter(like => like.targetType === 'answer'),
    [myLikes]
  );

  // Ranking Logic
  const getRankings = (likes: LikeData[], key: 'userId' | 'targetUserId') => {
    const counts: Record<string, number> = {};
    likes.forEach(like => {
      const id = like[key];
      if (id && id !== currentUserId) {
        counts[id] = (counts[id] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([id, count]) => {
        const p = participantMap.get(id);
        return {
          participantId: id,
          name: p?.name || '알 수 없음',
          profileImage: p?.profileImageCircle || p?.profileImage,
          count
        };
      })
      .sort((a, b) => b.count - a.count);
  };

  const receivedRankings = useMemo(() => getRankings(receivedLikes, 'userId'), [receivedLikes, participantMap]);
  const sentRankings = useMemo(() => getRankings(myLikes, 'targetUserId'), [myLikes, participantMap]);

  const receivedReviewGroups = useMemo(() => {
    const groups = new Map<string, LikeData[]>();
    receivedReviewLikes.forEach(like => {
      const existing = groups.get(like.targetId) || [];
      existing.push(like);
      groups.set(like.targetId, existing);
    });

    const result = Array.from(groups.entries()).map(([targetId, likes]) => {
      const submission = submissionsMap.get(targetId);
      const contentParticipant = submission ? participantMap.get(submission.participantId) : undefined;
      const likers = likes
        .map(like => participantMap.get(like.userId))
        .filter((p): p is Participant => !!p);

      return { targetId, likes, submission, contentParticipant, likers };
    });

    // 최근 좋아요 순으로: 그룹 내 createdAt max 기준
    const getLikeTime = (like: LikeData) => {
      const value = like.createdAt?.toDate?.() || like.createdAt;
      const date = value instanceof Date ? value : new Date(value);
      return date.getTime();
    };

    return result.sort((a, b) => {
      const aMax = Math.max(...a.likes.map(getLikeTime));
      const bMax = Math.max(...b.likes.map(getLikeTime));
      return bMax - aMax;
    });
  }, [receivedReviewLikes, submissionsMap, participantMap]);

  const receivedAnswerGroups = useMemo(() => {
    const groups = new Map<string, LikeData[]>();
    receivedAnswerLikes.forEach(like => {
      const existing = groups.get(like.targetId) || [];
      existing.push(like);
      groups.set(like.targetId, existing);
    });

    const result = Array.from(groups.entries()).map(([targetId, likes]) => {
      const submission = submissionsMap.get(targetId);
      const contentParticipant = submission ? participantMap.get(submission.participantId) : undefined;
      const likers = likes
        .map(like => participantMap.get(like.userId))
        .filter((p): p is Participant => !!p);

      return { targetId, likes, submission, contentParticipant, likers };
    });

    const getLikeTime = (like: LikeData) => {
      const value = like.createdAt?.toDate?.() || like.createdAt;
      const date = value instanceof Date ? value : new Date(value);
      return date.getTime();
    };

    return result.sort((a, b) => {
      const aMax = Math.max(...a.likes.map(getLikeTime));
      const bMax = Math.max(...b.likes.map(getLikeTime));
      return bMax - aMax;
    });
  }, [receivedAnswerLikes, submissionsMap, participantMap]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col bg-[#F6F6F6]">
      {/* 안내 문구 */}
      <div className="px-6 pt-4 pb-3 bg-[#F6F6F6]">
        <div className="bg-white rounded-[12px] p-4 shadow-xs">
          <p className="text-[13px] font-bold text-[#333D4B] mb-1">프라이빗 좋아요</p>
          <p className="text-[12px] text-[#8B95A1]">
            좋아요를 누르면 상대방만 알 수 있어요. 다른 멤버들에게는 공개되지 않습니다.
          </p>
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="px-6 py-4 bg-[#F6F6F6]">
        <div className="flex p-1 bg-[#F2F4F6] rounded-[12px]">
          <button
            onClick={() => setActiveTab('received')}
            className={cn(
              "flex-1 py-2 text-[13px] font-bold rounded-[8px] transition-all",
              activeTab === 'received'
                ? "bg-white text-[#333D4B] shadow-sm"
                : "text-[#8B95A1] hover:text-[#6B7684]"
            )}
          >
            받은 좋아요 <span className="ml-1 text-[#FF4B4B]">{receivedLikes.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={cn(
              "flex-1 py-2 text-[13px] font-bold rounded-[8px] transition-all",
              activeTab === 'sent'
                ? "bg-white text-[#333D4B] shadow-sm"
                : "text-[#8B95A1] hover:text-[#6B7684]"
            )}
          >
            보낸 좋아요 <span className="ml-1 text-[#FF4B4B]">{myLikes.length}</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-6 pb-32">
        {activeTab === 'received' ? (
          <div className="flex flex-col gap-6">
            {/* Top 3 Ranking */}
            <RankingCard
              title="나에게 좋아요를 가장 많이 보낸 멤버"
              rankings={receivedRankings}
              onProfileClick={onProfileClick}
              emptyMessage="아직 받은 좋아요가 없어요. 먼저 표현해보세요!"
            />

            {/* 감상평 (내 글 기준) */}
            <div className="bg-white rounded-[12px] p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("w-2 h-2 rounded-full", "bg-[#4A90D9]")} />
                <p className="text-[13px] font-bold text-[#333D4B]">감상평</p>
                <span className="text-[12px] text-[#8B95A1]">{receivedReviewLikes.length}개</span>
              </div>
              {receivedReviewGroups.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {receivedReviewGroups.map(group => (
                    <ReceivedLikeCard
                      key={group.targetId}
                      title={group.submission?.bookTitle || '감상평'}
                      subtitle={group.submission?.submissionDate}
                      preview={group.submission?.review || ''}
                      likeCount={group.likes.length}
                      submission={group.submission}
                      contentParticipant={group.contentParticipant}
                      likers={group.likers}
                      onOpenLikers={() => {
                        const uniqueParticipants = Array.from(
                          new Map(group.likers.map(p => [p.id, p])).values()
                        );
                        setLikersModalData({
                          title: `${group.submission?.bookTitle || '감상평'}에 좋아요`,
                          participants: uniqueParticipants,
                        });
                      }}
                      onOpenContent={() => {
                        if (!group.submission) return;
                        handleReviewClick(group.submission.participantId, group.submission);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-[#8B95A1] text-[13px]">
                  아직 받은 감상평 좋아요가 없습니다.
                </div>
              )}
            </div>

            {/* 가치관 답변 (내 글 기준) */}
            <div className="bg-white rounded-[12px] p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("w-2 h-2 rounded-full", "bg-[#F5A623]")} />
                <p className="text-[13px] font-bold text-[#333D4B]">가치관 답변</p>
                <span className="text-[12px] text-[#8B95A1]">{receivedAnswerLikes.length}개</span>
              </div>
              {receivedAnswerGroups.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {receivedAnswerGroups.map(group => (
                    <ReceivedLikeCard
                      key={group.targetId}
                      title={group.submission?.dailyQuestion || '가치관 답변'}
                      subtitle={group.submission?.submissionDate}
                      preview={group.submission?.dailyAnswer || ''}
                      likeCount={group.likes.length}
                      submission={group.submission}
                      contentParticipant={group.contentParticipant}
                      likers={group.likers}
                      onOpenLikers={() => {
                        const uniqueParticipants = Array.from(
                          new Map(group.likers.map(p => [p.id, p])).values()
                        );
                        setLikersModalData({
                          title: `${group.submission?.dailyQuestion || '가치관 답변'}에 좋아요`,
                          participants: uniqueParticipants,
                        });
                      }}
                      onOpenContent={() => {
                        if (!group.submission || !group.contentParticipant) return;
                        handleAnswerClick(group.contentParticipant, group.submission);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-[#8B95A1] text-[13px]">
                  아직 받은 가치관 답변 좋아요가 없습니다.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Top 3 Ranking */}
            <RankingCard
              title="내가 좋아요를 가장 많이 보낸 멤버"
              rankings={sentRankings}
              onProfileClick={onProfileClick}
              emptyMessage="아직 보낸 좋아요가 없어요. 마음을 표현해보세요!"
            />

            {/* 감상평 좋아요 목록 */}
            <LikeListSection
              title="감상평"
              likes={sentReviewLikes}
              submissionsMap={submissionsMap}
              participantMap={participantMap}
              participantKey="targetUserId"
              onProfileClick={onProfileClick}
              onReviewClick={handleReviewClick}
              onAnswerClick={handleAnswerClick}
              emptyMessage="아직 보낸 감상평 좋아요가 없습니다."
              accentColor="bg-[#4A90D9]"
            />

            {/* 가치관 답변 좋아요 목록 */}
            <LikeListSection
              title="가치관 답변"
              likes={sentAnswerLikes}
              submissionsMap={submissionsMap}
              participantMap={participantMap}
              participantKey="targetUserId"
              onProfileClick={onProfileClick}
              onReviewClick={handleReviewClick}
              onAnswerClick={handleAnswerClick}
              emptyMessage="아직 보낸 가치관 답변 좋아요가 없습니다."
              accentColor="bg-[#F5A623]"
            />
          </div>
        )}
      </div>

      {/* 가치관 답변 상세 모달 */}
      <Dialog open={!!answerModalData} onOpenChange={(open) => !open && setAnswerModalData(null)}>
        <DialogContent className="likes-answer-dialog sm:max-w-md sm:rounded-2xl">
          <DialogHeader className="text-left gap-1">
            <DialogTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden relative shrink-0">
                <Image
                  src={getResizedImageUrl(answerModalData?.participant.profileImageCircle || answerModalData?.participant.profileImage) || '/image/default-profile.svg'}
                  alt={answerModalData?.participant.name || ''}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              <span>{getFirstName(answerModalData?.participant.name || '')}의 가치관 답변</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              가치관 답변 상세 내용입니다.
            </DialogDescription>
          </DialogHeader>
          
          {answerModalData && (
            <div className="space-y-4">
              {/* 질문 */}
              <div className="bg-[#FFF8E1] rounded-[12px] p-4">
                <div className="bg-black rounded-[8px] px-2 py-1 inline-block mb-2">
                  <span className="text-white text-[11px] font-bold">가치관</span>
                </div>
                <p className="text-[14px] font-medium text-[#333D4B] leading-normal">
                  {answerModalData.submission.dailyQuestion}
                </p>
              </div>
              
              {/* 답변 */}
              <div className="px-1">
                <p className="text-[15px] text-[#333D4B] leading-[1.7] whitespace-pre-wrap">
                  {answerModalData.submission.dailyAnswer || '작성된 답변이 없습니다.'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 좋아요 준 사람 목록 모달 */}
      <Dialog open={!!likersModalData} onOpenChange={(open) => !open && setLikersModalData(null)}>
        <DialogContent className="sm:max-w-md sm:rounded-2xl">
          <DialogHeader className="text-left gap-1">
            <DialogTitle className="text-base">{likersModalData?.title || '좋아요'}</DialogTitle>
            <DialogDescription className="sr-only">좋아요를 준 사람 목록입니다.</DialogDescription>
          </DialogHeader>

          <div className="mt-2 max-h-[60vh] overflow-y-auto">
            {likersModalData?.participants?.length ? (
              <div className="flex flex-col divide-y divide-[#F2F4F6]">
                {likersModalData.participants.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex items-center gap-3 py-3 text-left hover:bg-[#F9FAFB] px-1 rounded-[10px] transition-colors"
                    onClick={() => {
                      setLikersModalData(null);
                      onProfileClick(p.id);
                    }}
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden relative shrink-0 bg-[#F2F4F6]">
                      <Image
                        src={getResizedImageUrl(p.profileImageCircle || p.profileImage) || '/image/default-profile.svg'}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#333D4B] truncate">{p.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-[#8B95A1] text-[13px]">
                좋아요를 준 사람이 없습니다.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 모달 스타일 */}
      <style jsx global>{`
        .likes-answer-dialog {
          margin: 0 !important;
          inset: auto 0 0 0 !important;
          width: 100% !important;
          max-width: none !important;
          border-radius: 28px 28px 0 0 !important;
          padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0px)) !important;
          box-shadow: 0 -20px 40px rgba(15, 23, 42, 0.18);
          max-height: 80vh;
          overflow-y: auto;
        }

        @media (min-width: 640px) {
          .likes-answer-dialog {
            inset: 50% auto auto 50% !important;
            transform: translate(-50%, -50%) !important;
            width: clamp(360px, 90vw, 480px) !important;
            border-radius: 20px !important;
            padding: 24px !important;
            box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
            max-height: 70vh;
          }
        }
      `}</style>
    </div>
  );
}
