import { useState, useEffect, useCallback } from 'react';
import { subscribeToMeetupMessages, sendMeetupMessage } from '@/lib/firebase/meetup-chat';
import type { MeetupMessage } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useMeetupChat(cohortId: string | undefined, participant: { id: string; name: string; profileImage?: string } | undefined) {
    const [messages, setMessages] = useState<MeetupMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    // Subscribe to messages
    useEffect(() => {
        if (!cohortId) return;

        setIsLoading(true);
        const unsubscribe = subscribeToMeetupMessages(cohortId, (newMessages) => {
            setMessages(newMessages);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [cohortId]);

    // Send message
    const sendMessage = useCallback(async (content: string, imageUrl?: string) => {
        if (!cohortId || !participant) {
            toast({ title: '메시지 전송 실패', description: '참가자 정보를 찾을 수 없습니다.', variant: 'destructive' });
            return false;
        }

        try {
            setIsSending(true);
            await sendMeetupMessage(cohortId, content, participant, imageUrl);
            return true;
        } catch (error) {
            toast({ title: '메시지 전송 실패', description: '잠시 후 다시 시도해주세요.', variant: 'destructive' });
            return false;
        } finally {
            setIsSending(false);
        }
    }, [cohortId, participant, toast]);

    return {
        messages,
        isLoading,
        isSending,
        sendMessage
    };
}

