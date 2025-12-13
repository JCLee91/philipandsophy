'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLikes } from '../hooks/use-likes';
import { useLockedToast } from '@/hooks/use-locked-toast';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  targetId: string;
  targetType: 'review' | 'answer';
  targetUserId: string;
  currentUserId?: string;
  initialCount?: number;
  className?: string;
  size?: number;
  /** 인증 안 했을 때 잠금 상태 */
  isLocked?: boolean;
}

export default function LikeButton({
  targetId,
  targetType,
  targetUserId,
  currentUserId,
  initialCount = 0,
  className,
  size = 18,
  isLocked = false,
}: LikeButtonProps) {
  const { isLiked, toggleLikeAsync } = useLikes(currentUserId);
  const { showLockedToast } = useLockedToast();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOwnTarget = Boolean(currentUserId && targetUserId && currentUserId === targetUserId);

  // Sync with global state
  useEffect(() => {
    if (currentUserId) {
      setLiked(isLiked(targetId));
    }
  }, [currentUserId, targetId, isLiked]);

  // initialCount가 갱신될 수 있으므로 (리렌더/재진입) 동기화
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    if (isOwnTarget) return;
    if (isSubmitting) return;

    // 인증 안 했으면 토스트 표시하고 리턴
    if (isLocked) {
      showLockedToast('like');
      return;
    }

    // Optimistic UI update
    const prevCount = count;
    const newLiked = !liked;
    setLiked(newLiked);
    setCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
    setIsAnimating(true);

    setIsSubmitting(true);
    try {
      const result = await toggleLikeAsync({
        targetId,
        targetType,
        targetUserId
      });
      // 서버 트랜잭션 결과 기준으로 보정 (실패/중복 클릭/레이스 방지)
      setLiked(result.isLiked);
      setCount(result.newCount);
    } catch {
      // 실패 시 카운트는 즉시 롤백 (liked는 global isLiked 동기화로 복구됨)
      setCount(prevCount);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 transition-colors duration-200 group active:scale-95",
        liked ? "text-[#FF4B4B]" : "text-[#8B95A1] hover:text-[#505967]",
        className
      )}
      disabled={!currentUserId || isSubmitting || isOwnTarget}
    >
      <div className="relative">
        <Heart 
          size={size} 
          className={cn(
            "transition-all duration-300",
            liked ? "fill-[#FF4B4B] stroke-[#FF4B4B]" : "stroke-current fill-transparent"
          )} 
        />
        {/* Burst Animation Effect */}
        <AnimatePresence>
          {liked && isAnimating && (
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 rounded-full border border-[#FF4B4B]"
              onAnimationComplete={() => setIsAnimating(false)}
            />
          )}
        </AnimatePresence>
      </div>
      
      {/* 
        카운트 표시 정책:
        1. 모두에게 숫자 표시 (요구사항: "외적으로 티가 많이 안났으면 좋겠어" -> "3 Likes"는 보임)
        2. 내가 좋아요 누른지 여부는 나만 봄 (Heart Filled)
      */}
      {count > 0 && (
        <span className={cn(
          "text-[12px] font-medium tabular-nums leading-none",
          liked ? "text-[#FF4B4B]" : "text-[#8B95A1]"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
