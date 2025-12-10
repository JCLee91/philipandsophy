'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLikes } from '../hooks/use-likes';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  targetId: string;
  targetType: 'review' | 'answer';
  targetUserId: string;
  currentUserId?: string;
  initialCount?: number;
  className?: string;
  size?: number;
}

export default function LikeButton({
  targetId,
  targetType,
  targetUserId,
  currentUserId,
  initialCount = 0,
  className,
  size = 18
}: LikeButtonProps) {
  const { isLiked, toggleLike } = useLikes(currentUserId);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sync with global state
  useEffect(() => {
    if (currentUserId) {
      setLiked(isLiked(targetId));
    }
  }, [currentUserId, targetId, isLiked]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return; // Or show login toast

    // Optimistic UI update
    const newLiked = !liked;
    setLiked(newLiked);
    setCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
    setIsAnimating(true);

    toggleLike({
      targetId,
      targetType,
      targetUserId
    });
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 transition-colors duration-200 group active:scale-95",
        liked ? "text-[#FF4B4B]" : "text-[#8B95A1] hover:text-[#505967]",
        className
      )}
      disabled={!currentUserId}
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
