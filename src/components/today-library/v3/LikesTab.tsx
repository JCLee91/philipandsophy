'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useLikes } from '@/features/likes/hooks/use-likes';
import { getResizedImageUrl } from '@/lib/image-utils';
import { normalizeTextForPreview } from '@/lib/text-utils';
import { getFirstName } from '@/lib/utils';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LikeData } from '@/features/likes/types';
import type { Participant, ReadingSubmission } from '@/types/database';

interface LikesTabProps {
  currentUserId: string;
  allParticipants: Participant[];
  onProfileClick: (participantId: string) => void;
  onReviewClick: (participantId: string) => void;
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

// 스크랩 카드 컴포넌트
function ScrapCard({
  like,
  submission,
  participant,
  onProfileClick,
  onReviewClick,
}: {
  like: LikeData;
  submission?: ReadingSubmission;
  participant?: Participant;
  onProfileClick: (id: string) => void;
  onReviewClick: (id: string) => void;
}) {
  if (!participant || !submission) return null;

  const content = like.targetType === 'review'
    ? submission.review
    : submission.dailyAnswer;

  const contentLabel = like.targetType === 'review' ? '감상평' : '가치관 답변';

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
            onClick={() => onReviewClick(participant.id)}
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
          onClick={() => onReviewClick(participant.id)}
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

export default function LikesTab({
  currentUserId,
  allParticipants,
  onProfileClick,
  onReviewClick,
}: LikesTabProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const { myLikes, receivedLikes, submissionsMap, isLoading } = useLikes(currentUserId);

  // Participant Map
  const participantMap = useMemo(() => {
    return new Map(allParticipants.map(p => [p.id, p]));
  }, [allParticipants]);

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

            {/* Scrap List */}
            <div className="bg-white rounded-[12px] p-5 shadow-xs">
              <p className="text-[13px] font-bold text-[#333D4B] mb-3">받은 좋아요 목록</p>
              {receivedLikes.length > 0 ? (
                <div className="flex flex-col">
                  {receivedLikes.map(like => (
                    <ScrapCard
                      key={like.id}
                      like={like}
                      submission={submissionsMap.get(like.targetId)}
                      participant={participantMap.get(like.userId)}
                      onProfileClick={onProfileClick}
                      onReviewClick={onReviewClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[#8B95A1] text-[13px]">
                  아직 받은 좋아요가 없습니다.
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

            {/* Scrap List */}
            <div className="bg-white rounded-[12px] p-5 shadow-xs">
              <p className="text-[13px] font-bold text-[#333D4B] mb-3">보낸 좋아요 목록</p>
              {myLikes.length > 0 ? (
                <div className="flex flex-col">
                  {myLikes.map(like => (
                    <ScrapCard
                      key={like.id}
                      like={like}
                      submission={submissionsMap.get(like.targetId)}
                      participant={participantMap.get(like.targetUserId)}
                      onProfileClick={onProfileClick}
                      onReviewClick={onReviewClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[#8B95A1] text-[13px]">
                  아직 보낸 좋아요가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
