'use client';

import { RefObject, useMemo } from 'react';
import { ArrowDown } from 'lucide-react';
import DateDivider from '@/components/DateDivider';
import MessageGroup from '@/components/MessageGroup';
import { groupMessagesByDate } from '@/lib/message-grouping';
import type { DirectMessage, Participant } from '@/types/database';

type MessageListProps = {
  messages: DirectMessage[];
  currentUserId: string;
  currentUser: Participant | null;
  otherUser: Participant | null;
  messageContainerRef: RefObject<HTMLDivElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
  showNewMessageButton: boolean;
  onScroll: () => void;
  onScrollToBottom: () => void;
  onImageClick: (imageUrl: string) => void;
};

export default function MessageList({
  messages,
  currentUserId,
  currentUser,
  otherUser,
  messageContainerRef,
  messagesEndRef,
  showNewMessageButton,
  onScroll,
  onScrollToBottom,
  onImageClick,
}: MessageListProps) {
  const dateSections = useMemo(() => groupMessagesByDate(messages), [messages]);

  return (
    <div ref={messageContainerRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                  onImageClick={onImageClick}
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
            onClick={onScrollToBottom}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all duration-normal active:scale-95"
          >
            <ArrowDown className="h-4 w-4 animate-bounce" />
            <span className="text-sm font-semibold">새 메시지</span>
          </button>
        </div>
      )}
    </div>
  );
}
