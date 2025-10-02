'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMessages, useSendMessage, useMarkAsRead } from '@/hooks/use-messages';
import { getConversationId } from '@/lib/firebase/messages';
import type { Participant } from '@/types/database';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Send, Paperclip, X } from 'lucide-react';
import { useState, useEffect, useRef, KeyboardEvent, useCallback } from 'react';
import { scrollToBottom } from '@/lib/utils';
import { uploadDMImage } from '@/lib/firebase/storage';
import Image from 'next/image';

interface DirectMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  otherUser: Participant | null;
}

export default function DirectMessageDialog({
  open,
  onOpenChange,
  currentUserId,
  otherUser,
}: DirectMessageDialogProps) {
  const [messageContent, setMessageContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationId = otherUser
    ? getConversationId(currentUserId, otherUser.id)
    : '';

  const { data: messages = [], isLoading } = useMessages(conversationId);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();

  const markMessagesAsRead = useCallback(() => {
    if (open && messages.length > 0 && conversationId) {
      markAsReadMutation.mutate({ conversationId, userId: currentUserId });
      scrollToBottom(messagesEndRef);
    }
  }, [open, messages.length, conversationId, currentUserId, markAsReadMutation]);

  useEffect(() => {
    markMessagesAsRead();
  }, [markMessagesAsRead]);

  const handleSend = async () => {
    if ((!messageContent.trim() && !imageFile) || !otherUser) return;

    try {
      setUploading(true);
      let imageUrl: string | undefined;

      // 이미지가 있으면 업로드
      if (imageFile) {
        imageUrl = await uploadDMImage(imageFile, currentUserId);
      }

      await sendMessageMutation.mutateAsync({
        conversationId,
        senderId: currentUserId,
        receiverId: otherUser.id,
        content: messageContent,
        imageUrl,
      });

      setMessageContent('');
      setImageFile(null);
      setImagePreview(null);
      setTimeout(() => scrollToBottom(messagesEndRef), 100);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!otherUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser.profileImage} alt={otherUser.name} />
              <AvatarFallback>{otherUser.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{otherUser.name}</div>
              <div className="text-xs text-muted-foreground font-normal">
                1:1 메시지
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              메시지를 보내보세요
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage
                      src={
                        isMine
                          ? otherUser.id === 'admin'
                            ? otherUser.profileImage
                            : '/favicon.webp'
                          : otherUser.profileImage
                      }
                    />
                    <AvatarFallback>
                      {isMine ? '나' : otherUser.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`rounded-2xl ${msg.imageUrl ? 'p-2' : 'px-4 py-2'} ${
                        isMine
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {msg.imageUrl && (
                        <div className="mb-2 relative w-48 h-48">
                          <Image
                            src={msg.imageUrl}
                            alt="첨부 이미지"
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                      {msg.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 px-1">
                      {format(msg.createdAt.toDate(), 'a h:mm', { locale: ko })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="border-t p-4">
          {/* 이미지 미리보기 */}
          {imagePreview && (
            <div className="mb-3 relative inline-block w-32 h-32">
              <Image
                src={imagePreview}
                alt="첨부 이미지"
                fill
                className="object-cover rounded border"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            <label className="cursor-pointer shrink-0">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button type="button" variant="outline" size="icon" asChild>
                <div>
                  <Paperclip className="h-4 w-4" />
                </div>
              </Button>
            </label>
            <Input
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              className="flex-1"
              disabled={uploading}
            />
            <Button
              onClick={handleSend}
              disabled={(!messageContent.trim() && !imageFile) || uploading}
              size="icon"
              className="shrink-0"
            >
              {uploading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

