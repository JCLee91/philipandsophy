'use client';

import { useRouter } from 'next/navigation';
import { Calendar, MapPin, MessageSquare, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Participant } from '@/types/database';

interface ConfirmedCardProps {
    result: NonNullable<Participant['socializingResult']>;
}

export default function ConfirmedCard({ result }: ConfirmedCardProps) {
    const router = useRouter();

    const handleEnterChat = () => {
        router.push(`/app/app/chat?cohort=${result.cohortId}`);
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg shadow-blue-200">
                    <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">모임이 확정되었어요!</h3>
                <p className="text-gray-500">
                    단톡방에서 멤버들과 인사를 나눠보세요
                </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3 text-left">
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

            <button
                onClick={handleEnterChat}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
                단톡방 입장하기
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}
