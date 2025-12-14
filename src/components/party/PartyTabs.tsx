'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import PartyParticipantList from './PartyParticipantList';
import PartyGroupsTab from './PartyGroupsTab';
import type { Participant } from '@/types/database';

type TabType = 'participants' | 'groups';

function parseTabParam(value: string | null): TabType {
  return value === 'groups' ? 'groups' : 'participants';
}

interface PartyTabsProps {
  participants: Participant[];
  currentUserName: string | null;
  highlightParticipantId: string | null;
  onProfileClick: (participantId: string) => void;
  errorMessage?: string;
}

export default function PartyTabs({
  participants,
  currentUserName,
  highlightParticipantId,
  onProfileClick,
  errorMessage,
}: PartyTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = useMemo(() => parseTabParam(searchParams.get('tab')), [searchParams]);
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const setTabAndUrl = (tab: TabType) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams.toString());
    if (tab === 'participants') next.delete('tab');
    else next.set('tab', tab);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-col">
      {/* 탭 네비게이션 */}
      <div className="bg-white sticky top-0 z-20 px-4 pt-2 border-b border-[#F2F4F6]">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setTabAndUrl('participants')}
            className="flex flex-col items-center gap-1 py-3 px-2 flex-1 relative"
          >
            <span
              className={cn(
                'text-[15px] font-bold transition-colors',
                activeTab === 'participants' ? 'text-[#333D4B]' : 'text-[#B0B8C1]'
              )}
            >
              참가자 리스트
            </span>
            {activeTab === 'participants' && (
              <motion.div
                layoutId="partyTab"
                className="absolute bottom-0 w-full h-[2px] bg-[#333D4B]"
              />
            )}
          </button>

          <button
            onClick={() => setTabAndUrl('groups')}
            className="flex flex-col items-center gap-1 py-3 px-2 flex-1 relative"
          >
            <span
              className={cn(
                'text-[15px] font-bold transition-colors',
                activeTab === 'groups' ? 'text-[#333D4B]' : 'text-[#B0B8C1]'
              )}
            >
              조 구성
            </span>
            {activeTab === 'groups' && (
              <motion.div
                layoutId="partyTab"
                className="absolute bottom-0 w-full h-[2px] bg-[#333D4B]"
              />
            )}
          </button>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="bg-[#F6F6F6] min-h-[calc(100vh-200px)]">
        <AnimatePresence mode="wait">
          {activeTab === 'participants' && (
            <motion.div
              key="participants"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-4"
            >
              {/* 안내 문구 */}
              <div className="bg-white rounded-[12px] p-4 shadow-sm mb-4">
                <p className="text-[15px] font-bold text-[#333D4B] mb-1">참가자 리스트</p>
                <p className="text-[13px] text-[#8B95A1] leading-relaxed">
                  이번 파티에 함께하는 멤버들입니다.
                  <br />
                  프로필북을 미리 읽어보고 오시면 더 깊은 대화를 나눌 수 있어요!
                </p>
              </div>

              <PartyParticipantList
                participants={participants}
                onProfileClick={onProfileClick}
                emptyMessage={errorMessage}
                highlightParticipantId={highlightParticipantId ?? undefined}
              />
            </motion.div>
          )}

          {activeTab === 'groups' && (
            <motion.div
              key="groups"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* 안내 문구 */}
              <div className="px-6 pt-4">
                <div className="bg-white rounded-[12px] p-4 shadow-sm mb-4">
                  <p className="text-[15px] font-bold text-[#333D4B] mb-1">조 구성</p>
                  <p className="text-[13px] text-[#8B95A1] leading-relaxed">
                    파티 중 3번의 자리 이동이 있습니다.
                    <br />
                    다양한 멤버들과 대화해보세요!
                  </p>
                </div>
              </div>

              <PartyGroupsTab
                participants={participants}
                currentUserName={currentUserName}
                onProfileClick={onProfileClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
