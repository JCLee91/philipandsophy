'use client';

import { useAdminConversations } from '@/hooks/chat/useAdminConversations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Loader2, Search, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import type { Participant } from '@/types/database';
import { Timestamp } from 'firebase/firestore';
import TopBar from '@/components/TopBar';
import { useRouter, useSearchParams } from 'next/navigation';
import DirectMessageDialog from '@/components/chat/DM/DirectMessageDialog';
import { useDirectMessageDialogState } from '@/hooks/chat/useDirectMessageDialogState';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminInquiriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { participant: currentUser } = useAuth();
  const { data: conversations = [], isLoading } = useAdminConversations();
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const [targetUserIdHandled, setTargetUserIdHandled] = useState(false);
  
  const dmDialog = useDirectMessageDialogState();

  useEffect(() => {
    setMounted(true);
  }, []);

  // 푸시 알림 클릭 시 특정 유저 대화 자동 열기
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    if (targetUserId && conversations.length > 0 && !targetUserIdHandled) {
      const targetConv = conversations.find(c => c.participantId === targetUserId);
      if (targetConv) {
        // 해당 유저 대화 열기
        const participant: Participant = {
          id: targetConv.participantId,
          name: targetConv.userInfo?.name || 'Unknown',
          profileImage: targetConv.userInfo?.profileImage,
          profileImageCircle: targetConv.userInfo?.profileImageCircle,
          cohortId: targetConv.userInfo?.cohortId || '',
          phoneNumber: '',
          firebaseUid: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        dmDialog.openWithParticipant({ participant });
        setTargetUserIdHandled(true);
        // URL에서 쿼리 파라미터 제거
        router.replace('/app/admin/inquiries', { scroll: false });
      }
    }
  }, [searchParams, conversations, router, dmDialog, targetUserIdHandled]);

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.userInfo?.name || '';
    const cohort = conv.userInfo?.cohortName || '';
    const term = searchTerm.toLowerCase();
    return name.toLowerCase().includes(term) || cohort.toLowerCase().includes(term);
  });

  // Prevent hydration mismatch by showing loading state until mounted
  if (!mounted || isLoading) {
    return (
      <>
        <div className="flex flex-col h-full bg-background">
          <TopBar
            title="문의함"
            align="center"
            leftAction={
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
                aria-label="뒤로가기"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            }
          />

          <div className="pt-14 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b sticky top-0 bg-background z-10">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="이름 또는 기수로 검색..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled
                  />
                </div>
              </div>

              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const handleSelect = (conv: any) => {
    // Construct a minimal Participant object
    const participant: Participant = {
      id: conv.participantId,
      name: conv.userInfo?.name || 'Unknown',
      profileImage: conv.userInfo?.profileImage,
      profileImageCircle: conv.userInfo?.profileImageCircle,
      cohortId: conv.userInfo?.cohortId || '',
      // Default values for required fields
      phoneNumber: '',
      firebaseUid: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    dmDialog.openWithParticipant({ participant });
  };

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      <TopBar
        title="문의함"
        align="center"
        leftAction={
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted transition-colors duration-normal"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      />

      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="border-b sticky top-0 bg-background z-10 px-4 py-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름 또는 기수로 검색..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {filteredConversations.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  대화 내역이 없습니다.
                </div>
              ) : (
                <div className="divide-y pb-20">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelect(conv)}
                      className="w-full flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12 border">
                          <AvatarImage src={conv.userInfo?.profileImageCircle || conv.userInfo?.profileImage} alt={conv.userInfo?.name} />
                          <AvatarFallback>{conv.userInfo?.name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        {conv.adminUnreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                            {conv.adminUnreadCount > 99 ? '99+' : conv.adminUnreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{conv.userInfo?.name || '알 수 없음'}</span>
                            {conv.userInfo?.cohortName && (
                              <span className="px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium">
                                {conv.userInfo.cohortName}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {conv.lastMessageAt ? formatDistanceToNow(conv.lastMessageAt.toDate ? conv.lastMessageAt.toDate() : new Date(conv.lastMessageAt.seconds * 1000), {
                              addSuffix: true,
                              locale: ko,
                            }) : ''}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${conv.adminUnreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {conv.lastMessage || '사진'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

      <DirectMessageDialog
        open={dmDialog.isOpen}
        onOpenChange={dmDialog.setOpen}
        currentUserId={currentUser?.id || ''}
        currentUser={currentUser}
        otherUser={dmDialog.target}
      />
    </>
  );
}

