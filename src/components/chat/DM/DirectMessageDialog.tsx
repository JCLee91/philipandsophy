'use client';
import { logger } from '@/lib/logger';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import UnifiedButton from '@/components/UnifiedButton';
import { useMessages } from '@/hooks/use-messages';
import { getConversationId } from '@/lib/firebase/messages';
import type { Participant } from '@/types/database';
import { Send, Paperclip, X, ArrowDown } from 'lucide-react';
import { useState, useEffect, useRef, KeyboardEvent, useCallback, useMemo } from 'react';
import { useImageUpload } from '@/hooks/use-image-upload';
import { FOOTER_STYLES } from '@/constants/ui';
import { APP_CONSTANTS } from '@/constants/app';
import ImageViewerDialog from '@/components/ImageViewerDialog';
import DateDivider from '@/components/DateDivider';
import MessageGroup from '@/components/MessageGroup';
import { groupMessagesByDate } from '@/lib/message-grouping';
import Image from 'next/image';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';
import { useDirectMessageActions } from '@/hooks/chat/useDirectMessageActions';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  const conversationId = useMemo(() => {
    if (!otherUser || !currentUserId) {
      logger.warn('[DirectMessageDialog] Missing required data', { otherUser: !!otherUser, currentUserId });
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

    logger.info('[DirectMessageDialog] conversationId generated', {
      currentUserId,
      otherUserId: otherUser.id,
      isAdmin: currentUser?.isAdministrator || currentUser?.isSuperAdmin,
      conversationId: result,
    });

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

  useEffect(() => {
    if (!open || !conversationId || !currentUser || !currentUserId || messages.length === 0) {
      return;
    }

    const userId = currentUserId;
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

  const handleSend = useCallback(async () => {
    const success = await sendMessage({
      content: messageContent,
      imageFile,
    });

    if (success) {
      setMessageContent('');
      resetImage();
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [imageFile, messageContent, resetImage, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSendMessage = messageContent.trim().length > 0 || !!imageFile;

  if (!otherUser) return null;

  const displayName =
    currentUser?.isSuperAdmin || currentUser?.isAdministrator ? otherUser.name : APP_CONSTANTS.ADMIN_NAME;
  const profileImageUrl =
    currentUser?.isSuperAdmin || currentUser?.isAdministrator
      ? otherUser.profileImageCircle || otherUser.profileImage
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
            <DialogDescription className="text-xs text-muted-foreground">1:1 메시지</DialogDescription>
          </DialogHeader>

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
              dateSections.map((section) => (
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

          <div className={FOOTER_STYLES.INPUT_CONTAINER}>
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
                  onClick={resetImage}
                  className="absolute -top-2 -right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-fast"
                  type="button"
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
                disabled={isUploading}
              />
              <UnifiedButton
                onClick={handleSend}
                disabled={!canSendMessage}
                loading={isUploading}
                className="h-10 w-10 p-0 shrink-0"
                icon={<Send className="h-4 w-4" />}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImageViewerDialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
        imageUrl={selectedImage || ''}
      />
    </>
  );
}
