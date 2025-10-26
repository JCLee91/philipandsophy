'use client';
import { logger } from '@/lib/logger';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import UnifiedButton from '@/components/UnifiedButton';
import { useMessages, useSendMessage, useMarkAsRead } from '@/hooks/use-messages';
import { getConversationId } from '@/lib/firebase/messages';
import type { Participant } from '@/types/database';
import { Send, Paperclip, X, ArrowDown } from 'lucide-react';
import { useState, useEffect, useRef, KeyboardEvent, ClipboardEvent, useCallback, useMemo } from 'react';
import { uploadDMImage } from '@/lib/firebase/storage';
import { useImageUpload } from '@/hooks/use-image-upload';
import { FOOTER_STYLES } from '@/constants/ui';
import { APP_CONSTANTS } from '@/constants/app';
import ImageViewerDialog from '@/components/ImageViewerDialog';
import DateDivider from '@/components/DateDivider';
import MessageGroup from '@/components/MessageGroup';
import { groupMessagesByDate } from '@/lib/message-grouping';
import Image from 'next/image';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { useToast } from '@/hooks/use-toast';

interface DirectMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  currentUser: Participant | null;
  otherUser: Participant | null;
}

export default function DirectMessageDialog({
  open,
  onOpenChange,
  currentUserId,
  currentUser,
  otherUser,
}: DirectMessageDialogProps) {
  useModalCleanup(open);

  const [messageContent, setMessageContent] = useState('');
  const { imageFile, imagePreview, handleImageSelect, resetImage } = useImageUpload();
  const [uploading, setUploading] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const { toast } = useToast();

  // conversationId 생성 로직
  const conversationId = useMemo(() => {
    if (!otherUser || !currentUserId) {
      logger.warn('[DirectMessageDialog] Missing required data', { otherUser: !!otherUser, currentUserId });
      return '';
    }

    let result = '';

    // admin과의 대화는 항상 현재 유저의 ID 사용
    // (관리자 권한을 가진 참가자가 admin과 대화할 때 "admin-admin" 방지)
    if (otherUser.id === 'admin') {
      result = getConversationId(currentUserId);
    }
    // 참가자 간 대화
    else if (currentUser?.isSuperAdmin || currentUser?.isAdministrator) {
      // 관리자가 다른 참가자와 대화: 상대방 ID 사용
      result = getConversationId(otherUser.id);
    }
    // 일반 참가자: 자신의 ID 사용
    else {
      result = getConversationId(currentUserId);
    }

    logger.info('[DirectMessageDialog] conversationId generated', {
      currentUserId,
      otherUserId: otherUser.id,
      isAdmin: currentUser?.isAdministrator || currentUser?.isSuperAdmin,
      conversationId: result,
    });

    return result;
  }, [otherUser, currentUser, currentUserId]);

  const { data: messages = [], isLoading } = useMessages(conversationId);
  const sendMessageMutation = useSendMessage();
  const { mutate: markConversationAsRead } = useMarkAsRead();

  // 메시지를 날짜별 섹션으로 그룹화
  const dateSections = useMemo(() => groupMessagesByDate(messages), [messages]);

  // 스크롤을 맨 아래로 이동하는 함수
  const scrollToBottomSmooth = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // 사용자가 스크롤 중인지 감지
  const handleScroll = useCallback(() => {
    if (!messageContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px 여유

    setIsUserScrolling(!isAtBottom);
  }, []);

  // 채팅창이 열릴 때 즉시 맨 아래로 스크롤
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      });
    } else {
      // 닫힐 때 상태 초기화
      setIsUserScrolling(false);
      setShowNewMessageButton(false);
      prevMessagesLengthRef.current = 0;
    }
  }, [open]);

  // 새 메시지가 도착했을 때 읽음 처리 (창이 열린 경우에만)
  useEffect(() => {
    if (!open || !conversationId || !currentUser || !currentUserId || messages.length === 0) {
      return;
    }

    // 관리자도 자신의 실제 participantId 사용 (receiverId와 매칭되도록)
    const userId = currentUserId;
    const hasUnread = messages.some((message) => !message.isRead && message.receiverId === userId);

    console.log('[DM Dialog] 📬 읽음 처리 체크', {
      open,
      conversationId,
      userId,
      messagesCount: messages.length,
      hasUnread,
    });

    if (hasUnread) {
      console.log('[DM Dialog] ⚡ markConversationAsRead 호출');
      markConversationAsRead({
        conversationId,
        userId,
      });
    }
  }, [open, conversationId, currentUser, currentUserId, messages, markConversationAsRead]);

  // 메시지 로드 완료 시 초기 스크롤 (open 직후 메시지 로딩 대응)
  useEffect(() => {
    if (open && messages.length > 0 && prevMessagesLengthRef.current === 0) {
      // 첫 로딩: 즉시 스크롤
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      });
    }
  }, [open, messages.length]);

  // 새 메시지가 도착했을 때 처리
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      const lastMessage = messages[messages.length - 1];
      const isMyMessage = lastMessage?.senderId === currentUserId;

      // 내가 보낸 메시지이거나, 사용자가 스크롤 중이 아닐 때만 자동 스크롤
      if (isMyMessage || !isUserScrolling) {
        scrollToBottomSmooth();
        setShowNewMessageButton(false);
      } else {
        // 사용자가 위로 스크롤 중이고 새 메시지가 도착하면 버튼 표시
        setShowNewMessageButton(true);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, currentUserId, isUserScrolling, scrollToBottomSmooth]);

  const handleSend = async () => {
    // 필수 데이터 검증
    if ((!messageContent.trim() && !imageFile) || !otherUser || !currentUser || !currentUserId) return;

    try {
      setUploading(true);
      let imageUrl: string | undefined;

      // 이미지가 있으면 업로드
      if (imageFile) {
        try {
          imageUrl = await uploadDMImage(imageFile, currentUserId);
        } catch (uploadError) {
          // Firebase Storage 특정 에러 처리
          const errorMessage = uploadError instanceof Error
            ? uploadError.message.includes('storage/quota-exceeded')
              ? '스토리지 용량이 초과되었습니다. 관리자에게 문의하세요.'
              : uploadError.message.includes('storage/unauthorized')
              ? '이미지 업로드 권한이 없습니다.'
              : '이미지 업로드에 실패했습니다.'
            : '이미지 업로드에 실패했습니다.';

          toast({
            title: '이미지 업로드 실패',
            description: errorMessage,
            variant: 'destructive',
          });
          throw uploadError; // 메시지 전송 중단
        }
      }

      await sendMessageMutation.mutateAsync({
        conversationId,
        senderId: currentUserId,
        receiverId: (currentUser.isSuperAdmin || currentUser.isAdministrator) ? otherUser.id : 'admin',  // 관리자가 보낼 때: 참가자에게, 참가자가 보낼 때: admin에게
        content: messageContent,
        imageUrl,
      });

      setMessageContent('');
      resetImage();
      // 메시지 전송 후 부드럽게 스크롤 (딜레이 최소화)
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (error) {
      logger.error('메시지 전송 실패:', error);

      // 이미지 업로드 에러가 아닌 경우에만 메시지 전송 실패 토스트 표시
      if (error instanceof Error && !error.message.includes('storage/')) {
        toast({
          title: '메시지 전송 실패',
          description: '메시지를 전송하지 못했습니다. 다시 시도해주세요.',
          variant: 'destructive',
        });
      }
    } finally {
      setUploading(false);
    }
  };


  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!otherUser) return null;

  // 참가자가 볼 때는 항상 "필립앤소피", 관리자가 볼 때는 참가자 이름
  const displayName = (currentUser?.isSuperAdmin || currentUser?.isAdministrator) ? otherUser.name : APP_CONSTANTS.ADMIN_NAME;
  const profileImageUrl = (currentUser?.isSuperAdmin || currentUser?.isAdministrator)
    ? (otherUser.profileImageCircle || otherUser.profileImage)
    : '/favicon.webp';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profileImageUrl} alt={displayName} />
              <AvatarFallback>
                {otherUser.isAdministrator ? 'P&S' : displayName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{displayName}</div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            1:1 메시지
          </DialogDescription>
        </DialogHeader>

        {/* 메시지 영역 */}
        <div
          ref={messageContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              메시지를 보내보세요
            </div>
          ) : (
            dateSections.map((section, sectionIndex) => (
              <div key={section.date.getTime()}>
                {/* 날짜 구분선 */}
                <DateDivider label={section.dateLabel} />

                {/* 메시지 그룹들 */}
                <div className="space-y-2">
                  {section.groups.map((group, groupIndex) => (
                    <MessageGroup
                      key={`${group.senderId}-${groupIndex}`}
                      senderId={group.senderId}
                      messages={group.messages}
                      showAvatar={group.showAvatar}
                      showTimestamp={group.showTimestamp}
                      currentUserId={currentUserId}
                      currentUser={currentUser}
                      otherUser={otherUser}
                      onImageClick={setSelectedImage}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />

          {/* 새 메시지 보기 버튼 - 애니메이션 개선 */}
          {showNewMessageButton && (
            <div className="sticky bottom-2 flex justify-center pointer-events-none animate-in fade-in-0 slide-in-from-bottom-4 duration-normal">
              <button
                onClick={() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  setShowNewMessageButton(false);
                }}
                className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all duration-normal active:scale-95"
              >
                <ArrowDown className="h-4 w-4 animate-bounce" />
                <span className="text-sm font-semibold">새 메시지</span>
              </button>
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div className={FOOTER_STYLES.INPUT_CONTAINER}>
          {/* 이미지 미리보기 */}
          {imagePreview && (
            <div className={`${FOOTER_STYLES.IMAGE_PREVIEW_MARGIN} relative inline-block w-32 h-32 animate-in fade-in-0 duration-fast`}>
              <Image
                src={imagePreview}
                alt="첨부 이미지"
                fill
                sizes="128px"
                className="object-cover rounded border"
              />
              <button
                onClick={resetImage}
                className="absolute -top-2 -right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-fast"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          )}

          <div className={`flex ${FOOTER_STYLES.BUTTON_GAP}`}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="dm-image-upload"
            />
            <UnifiedButton
              type="button"
              variant="outline"
              onClick={() => document.getElementById('dm-image-upload')?.click()}
              className="h-10 w-10 p-0 shrink-0"
              icon={<Paperclip className="h-4 w-4" />}
            />
            <Input
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              className="flex-1"
              disabled={uploading}
            />
            <UnifiedButton
              onClick={handleSend}
              disabled={!messageContent.trim() && !imageFile}
              loading={uploading}
              className="h-10 w-10 p-0 shrink-0"
              icon={<Send className="h-4 w-4" />}
            />
          </div>
        </div>
      </DialogContent>
      </Dialog>

      {/* 이미지 뷰어 다이얼로그 - Sibling으로 렌더링하여 z-index 충돌 방지 */}
      <ImageViewerDialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
        imageUrl={selectedImage || ''}
      />
    </>
  );
}
