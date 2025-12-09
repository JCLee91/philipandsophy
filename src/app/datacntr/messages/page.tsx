'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { getResizedImageUrl } from '@/lib/image-utils';
import { MessageSquare, CheckCheck, Clock } from 'lucide-react';
import { formatTimestampKST } from '@/lib/datacntr/timestamp';
import { useDatacntrAuth, useFetchWithAuth } from '@/hooks/datacntr';
import { DatacntrPageShell } from '@/components/datacntr/layout';
import type { DirectMessage } from '@/types/database';

export const dynamic = 'force-dynamic';

interface MessageWithParticipant extends DirectMessage {
  senderName: string;
  receiverName: string;
}

export default function MessagesPage() {
  const { user, isLoading: authLoading, selectedCohortId } = useDatacntrAuth();

  // 메시지 데이터 로드
  const { data: messages, isLoading } = useFetchWithAuth<MessageWithParticipant[]>({
    url: `/api/datacntr/messages?cohortId=${selectedCohortId}`,
    enabled: !!selectedCohortId,
    deps: [selectedCohortId],
    initialData: [],
  });

  const unreadCount = useMemo(() => messages?.filter((m) => !m.isRead).length || 0, [messages]);

  if (!user && !authLoading) return null;

  return (
    <DatacntrPageShell
      title="메시지 분석"
      description="전체 DM 내역"
      isLoading={authLoading || isLoading}
      requiresCohort
      hasCohortSelected={!!selectedCohortId}
    >
      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 메시지</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{messages?.length || 0}개</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-200">
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
        {messages?.map((message) => (
          <div
            key={message.id}
            className={`rounded-xl p-4 border ${
              message.isRead ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
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
                <Image
                  src={getResizedImageUrl(message.imageUrl) || message.imageUrl}
                  alt="메시지 이미지"
                  width={400}
                  height={400}
                  className="max-w-xs rounded-lg border border-gray-200 h-auto w-full"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {messages?.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-12 text-center">
          <p className="text-gray-500">메시지가 없습니다</p>
        </div>
      )}
    </DatacntrPageShell>
  );
}
