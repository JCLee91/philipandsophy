'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, MessageSquare, CheckCheck, Clock } from 'lucide-react';
import { formatTimestampKST } from '@/lib/datacntr/timestamp';
import { useDatacntrStore } from '@/stores/datacntr-store';
import type { DirectMessage } from '@/types/database';


// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';
interface MessageWithParticipant extends DirectMessage {
  senderName: string;
  receiverName: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { selectedCohortId } = useDatacntrStore();
  const [messages, setMessages] = useState<MessageWithParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/datacntr/login');
    }
  }, [authLoading, user, router]);

  // 메시지 데이터 로드 (기수별 필터링)
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const idToken = await user.getIdToken();
        const url = selectedCohortId === 'all'
          ? '/api/datacntr/messages'
          : `/api/datacntr/messages?cohortId=${selectedCohortId}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('메시지 조회 실패');
        }

        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [user, selectedCohortId]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">메시지 분석</h1>
        <p className="text-gray-600 mt-2">전체 DM 내역</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 메시지</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{messages.length}개</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">읽지 않은 메시지</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{unreadCount}개</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 메시지 리스트 */}
      <div className="space-y-4">
        {messages.map((message) => {
          return (
            <div
              key={message.id}
              className={`rounded-xl p-4 border ${
                message.isRead
                  ? 'bg-white border-gray-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-900">{message.senderName}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-600">{message.receiverName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {message.isRead ? (
                    <CheckCheck className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-orange-500" />
                  )}
                  <span className="text-xs text-gray-500">
                    {formatTimestampKST(message.createdAt, 'M월 d일 HH:mm')}
                  </span>
                </div>
              </div>
              <p className="text-gray-700">{message.content}</p>
              {message.imageUrl && (
                <div className="mt-3">
                  <img
                    src={message.imageUrl}
                    alt="메시지 이미지"
                    className="max-w-xs rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {messages.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">메시지가 없습니다</p>
        </div>
      )}
    </div>
  );
}
