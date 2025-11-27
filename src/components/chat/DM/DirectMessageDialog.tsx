'use client';
import { logger } from '@/lib/logger';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import UnifiedButton from '@/components/UnifiedButton';
import { useMessages } from '@/hooks/use-messages';
import { getConversationId } from '@/lib/firebase/messages';
import type { Participant } from '@/types/database';
import { Send, Paperclip, X, ArrowDown } from 'lucide-react';
import { useState, useEffect, useRef, KeyboardEvent, useCallback, useMemo, CSSProperties } from 'react';
import { useImageUpload } from '@/hooks/use-image-upload';
import { FOOTER_STYLES } from '@/constants/ui';
import { APP_CONSTANTS } from '@/constants/app';
import { Z_INDEX } from '@/constants/z-index';
import ImageViewerDialog from '@/components/ImageViewerDialog';
import DateDivider from '@/components/DateDivider';
import MessageGroup from '@/components/MessageGroup';
import { groupMessagesByDate } from '@/lib/message-grouping';
import Image from 'next/image';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { useDirectMessageActions } from '@/hooks/chat/useDirectMessageActions';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { getResizedImageUrl } from '@/lib/image-utils';

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
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [inputAreaHeight, setInputAreaHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyboardHeight = useKeyboardHeight();

  const handleImageReset = useCallback(() => {
    resetImage();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetImage]);

  const conversationId = useMemo(() => {
    if (!currentUserId || !otherUser) {
      return '';
    }

    let result = '';

    if (otherUser.id === 'admin') {
      result = getConversationId(currentUserId);
    } else if (currentUser?.isSuperAdmin || currentUser?.isAdministrator) {
      result = getConversationId(otherUser.id);
    } else {
      result = getConversationId(currentUserId);
    }

    return result;
  }, [otherUser, currentUser, currentUserId]);

  const { data: messages = [] } = useMessages(conversationId);
  const dmActions = useDirectMessageActions({
    conversationId,
    currentUserId,
    currentUser,
    otherUser,
  });

  const { sendMessage, markAsRead, isUploading } = dmActions;

  const dateSections = useMemo(() => groupMessagesByDate(messages), [messages]);

  const scrollToBottomSmooth = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const scrollToBottomAndHideButton = useCallback(() => {
    scrollToBottomSmooth();
    setShowNewMessageButton(false);
  }, [scrollToBottomSmooth]);

  const handleScroll = useCallback(() => {
    if (!messageContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setIsUserScrolling(!isAtBottom);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      });
    } else {
      setIsUserScrolling(false);
      setShowNewMessageButton(false);
      prevMessagesLengthRef.current = 0;
    }
  }, [open]);

  // ✅ DM 다이얼로그 열릴 때 dm 타입 알림 제거 (알림센터 정리)
  useEffect(() => {
    if (open && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_NOTIFICATIONS_BY_TYPE',
        notificationType: 'dm',
      });
    }
  }, [open]);

  // ✅ DM 다이얼로그 열릴 때 앱 아이콘 배지 제거
  useEffect(() => {
    if (open && 'clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(() => {
        // Badge API not supported or failed, ignore
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open || !conversationId || !currentUser || !currentUserId || messages.length === 0) {
      return;
    }

    const userId = (currentUser.isSuperAdmin || currentUser.isAdministrator) ? 'admin' : currentUserId;
    const hasUnread = messages.some((message) => !message.isRead && message.receiverId === userId);

    if (hasUnread) {
      markAsRead({ userId });
    }
  }, [open, conversationId, currentUser, currentUserId, messages, markAsRead]);

  useEffect(() => {
    if (open && messages.length > 0 && prevMessagesLengthRef.current === 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      });
    }
  }, [open, messages.length]);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      const lastMessage = messages[messages.length - 1];
      const isMyMessage = lastMessage?.senderId === currentUserId;

      if (isMyMessage || !isUserScrolling) {
        scrollToBottomSmooth();
        setShowNewMessageButton(false);
      } else {
        setShowNewMessageButton(true);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, currentUserId, isUserScrolling, scrollToBottomSmooth]);

  // 입력 영역 높이를 추적하여 메시지 리스트 하단 패딩에 반영
  useEffect(() => {
    if (!inputContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setInputAreaHeight(entry.contentRect.height);
      }
    });

    observer.observe(inputContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // 키보드가 올라올 때 자동으로 최신 메시지로 스크롤
  useEffect(() => {
    if (keyboardHeight > 0) {
      requestAnimationFrame(() => {
        const container = messageContainerRef.current;
        if (!container) return;
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      });
    }
  }, [keyboardHeight]);

  // Auto-grow textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [messageContent]);

  const handleSend = useCallback(async () => {
    if (!messageContent.trim() && !imageFile) return;

    const contentToSend = messageContent;
    const imageToSend = imageFile;

    // Optimistic UI: Clear input immediately
    setMessageContent('');
    handleImageReset();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    const success = await sendMessage({
      content: contentToSend,
      imageFile: imageToSend,
    });

    if (!success) {
      // Restore on failure
      setMessageContent(contentToSend);
      // Note: Image restoration is complex with current hook structure, skipping for now
      // You might want to show a toast error here
    }
  }, [imageFile, messageContent, handleImageReset, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      // Desktop only: Enter to send
      if (typeof window !== 'undefined' && window.innerWidth >= 640) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const canSendMessage = messageContent.trim().length > 0 || !!imageFile;

  const displayName =
    currentUser?.isSuperAdmin || currentUser?.isAdministrator ? otherUser?.name || '' : APP_CONSTANTS.ADMIN_NAME;
  const profileImageUrl =
    currentUser?.isSuperAdmin || currentUser?.isAdministrator
      ? getResizedImageUrl(otherUser?.profileImageCircle || otherUser?.profileImage) || otherUser?.profileImageCircle || otherUser?.profileImage
      : '/favicon.webp';

  // Early returns AFTER all hooks
  if (!otherUser || !open) return null;

  const isKeyboardOpen = keyboardHeight > 0;
  const bottomSafeSpacing = 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)';
  const messageListPaddingBottom = `calc(${Math.max(inputAreaHeight, 72)}px + env(safe-area-inset-bottom, 0px) + 1rem)`;

  const dialogDynamicStyle: CSSProperties = isKeyboardOpen
    ? {
      top: '1rem',
      transform: 'none',
      height: `calc(100vh - 1rem - ${bottomSafeSpacing} - ${keyboardHeight}px)`,
      maxHeight: `calc(100vh - 1rem - ${bottomSafeSpacing})`,
      minHeight: '360px',
    }
    : {
      top: '50%',
      transform: 'translateY(-50%)',
      height: '600px',
    };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: Z_INDEX.DM_DIALOG }}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={`fixed z-[9999] bg-background transition-all duration-300 
          inset-0 w-full h-full 
          sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 
          sm:w-full sm:max-w-lg sm:h-[600px] sm:rounded-xl sm:border sm:shadow-lg
          animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
        style={
          !isKeyboardOpen && typeof window !== 'undefined' && window.innerWidth >= 640
            ? {} // Desktop: Use Tailwind classes
            : isKeyboardOpen
              ? {
                // Mobile Keyboard Open: Adjust height manually if needed, or rely on fixed positioning
                height: `calc(100vh - ${keyboardHeight}px)`,
                top: 0,
              }
              : {
                // Mobile Default: Full screen
                height: '100%',
                top: 0,
              }
        }
      >
        <div className="flex flex-col h-full w-full bg-background sm:rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profileImageUrl} alt={displayName} />
                <AvatarFallback>
                  {otherUser.isAdministrator ? 'P&S' : displayName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-heading-lg font-bold">{displayName}</h2>
                  {(currentUser?.isSuperAdmin || currentUser?.isAdministrator) && !otherUser.isAdministrator && otherUser.cohortId && (
                    <span className="px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium">
                      {otherUser.cohortId}기
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary">1:1 메시지</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex items-center justify-center h-11 w-11 -mr-2 rounded-lg text-muted-foreground transition-colors hover:bg-gray-100 hover:text-text-primary active:bg-gray-200"
              aria-label="닫기"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={messageContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
            style={{
              paddingBottom: messageListPaddingBottom,
              scrollPaddingBottom: messageListPaddingBottom,
            }}
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                메시지를 보내보세요
              </div>
            ) : (
              dateSections.map((section, sectionIndex) => (
                <div key={section.date.getTime()}>
                  <DateDivider label={section.dateLabel} />
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
                        isFirstGroup={sectionIndex === 0 && groupIndex === 0}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />

            {showNewMessageButton && (
              <div className="sticky bottom-2 flex justify-center pointer-events-none animate-in fade-in-0 slide-in-from-bottom-4 duration-normal">
                <button
                  onClick={scrollToBottomAndHideButton}
                  className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all duration-normal active:scale-95"
                >
                  <ArrowDown className="h-4 w-4 animate-bounce" />
                  <span className="text-sm font-semibold">새 메시지</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div
            className={`${FOOTER_STYLES.INPUT_CONTAINER} ${
              !isKeyboardOpen ? 'pb-[calc(1rem+env(safe-area-inset-bottom))]' : ''
            }`}
            ref={inputContainerRef}
          >
            {imagePreview && (
              <div
                className={`${FOOTER_STYLES.IMAGE_PREVIEW_MARGIN} relative inline-block w-32 h-32 animate-in fade-in-0 duration-fast`}
              >
                <Image
                  src={imagePreview}
                  alt="첨부 이미지"
                  fill
                  sizes="128px"
                  className="object-cover rounded border"
                />
                <button
                  onClick={handleImageReset}
                  className="absolute -top-2 -right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-fast"
                  type="button"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            )}

            <div className={`flex ${FOOTER_STYLES.BUTTON_GAP}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="dm-image-upload"
              />
              <UnifiedButton
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-10 w-10 p-0 shrink-0"
                icon={<Paperclip className="h-4 w-4" />}
              />
              <Textarea
                ref={textareaRef}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none py-2.5 text-base leading-snug"
                disabled={isUploading}
                rows={1}
              />
              <UnifiedButton
                onClick={handleSend}
                disabled={!canSendMessage}
                loading={isUploading}
                className={`h-10 w-10 p-0 shrink-0 transition-all duration-200 ${canSendMessage
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : 'bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted'
                  }`}
                icon={<Send className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>
      </div >

      <ImageViewerDialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
        imageUrl={selectedImage || ''}
      />
    </>
  );
}
