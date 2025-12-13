'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { getResizedImageUrl } from '@/lib/image-utils';
import type { Participant } from '@/types/database';

interface CohortSelectModalProps {
  isOpen: boolean;
  participants: Participant[]; // 같은 전화번호의 여러 기수 참가자들
  currentParticipantId: string; // 현재 로그인한 참가자 ID (API 호출용)
  onSelect: (participant: Participant) => void;
  onClose: () => void; // 닫기 시 기본값(최초 기수) 적용
}

function parseCohortNumber(cohortId: string) {
  const extracted = cohortId.replace(/\D/g, '');
  const n = Number.parseInt(extracted, 10);
  return Number.isFinite(n) ? n : 0;
}

function getCohortDisplayName(cohortId: string) {
  // cohort-1 → 1기, cohort-4-1 → 4-1기
  const match = cohortId.match(/cohort-(.+)/);
  if (match) {
    return `${match[1]}기`;
  }
  return cohortId;
}

export default function CohortSelectModal({
  isOpen,
  participants,
  currentParticipantId,
  onSelect,
  onClose,
}: CohortSelectModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  // 기수 순으로 정렬 (최초 기수부터)
  const sortedParticipants = [...participants].sort((a, b) => {
    return parseCohortNumber(a.cohortId) - parseCohortNumber(b.cohortId);
  });

  const handleSelect = async (participant: Participant) => {
    setIsLoading(true);
    try {
      // API 호출하여 DB에 저장
      const response = await fetch('/api/party/preferred-cohort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipantId,
          preferredCohortId: participant.cohortId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferred cohort');
      }

      onSelect(participant);
    } catch (error) {
      console.error('Error saving preferred cohort:', error);
      // 에러가 나도 일단 선택 처리
      onSelect(participant);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    // 닫기 시 최초 기수(첫 번째)로 자동 설정
    if (sortedParticipants.length > 0) {
      await handleSelect(sortedParticipants[0]);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
          >
            {/* 헤더 */}
            <div className="px-6 pt-6 pb-4 relative">
              {/* 닫기 버튼 */}
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="#8B95A1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <h2 className="text-lg font-bold text-[#333D4B] text-center">
                프로필북 선택
              </h2>
              <p className="text-sm text-[#8B95A1] text-center mt-1">
                다른 참가자들에게 보여줄 프로필북을 선택해주세요
              </p>
            </div>

            {/* 프로필북 목록 */}
            <div className="px-4 pb-6 space-y-2">
              {sortedParticipants.map((participant) => (
                <button
                  key={participant.id}
                  onClick={() => handleSelect(participant)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#F9FAFB] hover:bg-[#F2F4F6] active:bg-[#E5E8EB] transition-colors disabled:opacity-50"
                >
                  {/* 프로필 이미지 */}
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-white">
                    <Image
                      src={
                        getResizedImageUrl(participant.profileImageCircle || participant.profileImage) ||
                        participant.profileImageCircle ||
                        participant.profileImage ||
                        '/image/default-profile.svg'
                      }
                      alt={participant.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* 프로필북 정보 */}
                  <div className="flex-1 text-left">
                    <p className="text-base font-bold text-[#333D4B]">
                      {getCohortDisplayName(participant.cohortId)} 프로필북
                    </p>
                    <p className="text-sm text-[#8B95A1]">
                      {participant.name}
                    </p>
                  </div>

                  {/* 화살표 */}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7.5 15L12.5 10L7.5 5"
                      stroke="#B0B8C1"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>

            {/* 로딩 오버레이 */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#333D4B] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
