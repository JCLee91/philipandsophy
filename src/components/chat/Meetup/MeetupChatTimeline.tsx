'use client';

import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MeetupMessage, Participant } from '@/types/database';
import { cn } from '@/lib/utils';

interface MeetupChatTimelineProps {
    messages: MeetupMessage[];
    currentUserId?: string;
}

export default function MeetupChatTimeline({ messages, currentUserId }: MeetupChatTimelineProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages.length]);

    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-sm">
                <p>아직 대화가 없습니다.</p>
                <p>첫 메시지를 남겨보세요!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 pb-4">
            {messages.map((msg, index) => {
                const isMe = msg.authorId === currentUserId;
                const showProfile = !isMe && (index === 0 || messages[index - 1].authorId !== msg.authorId);
                const showTime = index === messages.length - 1 || messages[index + 1].authorId !== msg.authorId || 
                    (msg.createdAt?.seconds - messages[index + 1]?.createdAt?.seconds > 60);

                return (
                    <div key={msg.id} className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}>
                        {/* Profile Image (Left side, only for others) */}
                        {!isMe && (
                            <div className="w-8 flex-shrink-0 flex flex-col items-center">
                                {showProfile ? (
                                    <Avatar className="w-8 h-8 border border-gray-100">
                                        <AvatarImage src={msg.authorProfileImage} />
                                        <AvatarFallback className="text-[10px] bg-gray-100">
                                            {msg.authorName?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : <div className="w-8" />}
                            </div>
                        )}

                        <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
                            {/* Author Name (Only for others, when profile shown) */}
                            {!isMe && showProfile && (
                                <span className="text-xs text-gray-500 ml-1 mb-1">{msg.authorName}</span>
                            )}

                            {/* Message Bubble */}
                            <div className={cn(
                                "px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm",
                                isMe 
                                    ? "bg-black text-white rounded-tr-none" 
                                    : "bg-white text-black border border-gray-200 rounded-tl-none"
                            )}>
                                {msg.content}
                            </div>

                            {/* Timestamp */}
                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                {msg.createdAt ? format(msg.createdAt.toDate(), 'a h:mm', { locale: ko }) : '방금 전'}
                            </span>
                        </div>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
}

