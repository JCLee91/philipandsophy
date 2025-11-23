'use client';

import { useRouter } from 'next/navigation';
import { Calendar, MapPin, MessageSquare, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Participant } from '@/types/database';
import { appRoutes } from '@/lib/navigation';
import UnifiedButton from '@/components/UnifiedButton';

interface ConfirmedCardProps {
    result: NonNullable<Participant['socializingResult']>;
}

export default function ConfirmedCard({ result }: ConfirmedCardProps) {
    const router = useRouter();

    const handleEnterChat = () => {
        router.push(appRoutes.chat(result.cohortId));
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center mb-4">
            <div className="flex flex-col items-center mb-4">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-2 text-white shadow-lg shadow-black/10">
                    <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">모임이 확정되었어요!</h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-left">
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900">
                        {format(new Date(result.date), 'M월 d일 (EEE)', { locale: ko })}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900">
                        {result.location}
                    </span>
                </div>
            </div>
            
            {/* "단톡방 입장하기" 버튼 제거 - 이미 채팅방 내에 있음 */}
        </div>
    );
}
