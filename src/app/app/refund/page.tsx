'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, MessageSquare, Camera, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { joinRefundMeetup } from '@/features/refund/actions/refund-actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 환불 모임 선택 가능한 날짜 및 장소
const AVAILABLE_DATES = [
    '2025-11-29',
    '2025-11-30',
    '2025-12-06',
    '2025-12-07',
];

const AVAILABLE_LOCATIONS = [
    '강남',
    '홍대',
    '성수',
    '이태원',
];

export default function RefundGuidePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

    const handleJoinMeetup = () => {
        if (!selectedDate || !selectedLocation) return;

        startTransition(async () => {
            const result = await joinRefundMeetup(selectedDate, selectedLocation);

            if (result.success && result.cohortId) {
                toast({
                    title: '모임 참여 완료!',
                    description: '단톡방으로 이동합니다.',
                });
                router.push(`/app/chat?cohort=${result.cohortId}`);
            } else {
                toast({
                    title: '참여 실패',
                    description: result.error || '오류가 발생했습니다.',
                    variant: 'destructive',
                });
            }
        });
    };

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            <div className="pt-12 pb-8 px-6 text-center">
                <p className="text-blue-400 font-bold mb-2">Special Benefit!</p>
                <h1 className="text-3xl font-bold mb-4">지원금 환급 방법</h1>
                <p className="text-gray-400 text-sm">
                    필립앤소피 앱에서 후속 소셜링에 참여할 수 있어요
                </p>
            </div>

            {/* Steps Container */}
            <div className="max-w-md mx-auto px-4 space-y-12">

                {/* Step 1: Date Selection */}
                <div className="relative">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 text-black">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">가능한 날짜를</h3>
                        <h3 className="text-lg font-bold">선택해 주세요</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {AVAILABLE_DATES.map((date) => (
                            <button
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                className={cn(
                                    "p-3 rounded-xl border transition-all text-sm font-medium",
                                    selectedDate === date
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600"
                                )}
                            >
                                {format(new Date(date), 'M월 d일 (EEE)', { locale: ko })}
                            </button>
                        ))}
                    </div>

                    {/* Arrow Connector */}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-gray-600">
                        <ChevronRight className="w-6 h-6 rotate-90" />
                    </div>
                </div>

                {/* Step 2: Location Selection */}
                <div className="relative">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 text-black">
                            <MapPin className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">원하는 위치를</h3>
                        <h3 className="text-lg font-bold">선택해 주세요</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {AVAILABLE_LOCATIONS.map((loc) => (
                            <button
                                key={loc}
                                onClick={() => setSelectedLocation(loc)}
                                className={cn(
                                    "p-3 rounded-xl border transition-all text-sm font-medium",
                                    selectedLocation === loc
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600"
                                )}
                            >
                                {loc}
                            </button>
                        ))}
                    </div>

                    {/* Arrow Connector */}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-gray-600">
                        <ChevronRight className="w-6 h-6 rotate-90" />
                    </div>
                </div>

                {/* Step 3: Chat Info */}
                <div className="relative">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 text-black relative">
                            <MessageSquare className="w-8 h-8" />
                            <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-white rounded-lg flex items-center justify-center border-2 border-black">
                                <div className="w-4 h-4 bg-gray-300 rounded-sm" />
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-1">참석자들을 위한</h3>
                        <h3 className="text-lg font-bold mb-4">단톡방이 열려요</h3>

                        <button
                            onClick={handleJoinMeetup}
                            disabled={!selectedDate || !selectedLocation || isPending}
                            className={cn(
                                "w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2",
                                selectedDate && selectedLocation && !isPending
                                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20"
                                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                            )}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    참여하는 중...
                                </>
                            ) : (
                                <>
                                    단톡방 입장하기
                                    <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                        {!selectedDate || !selectedLocation ? (
                            <p className="text-xs text-gray-500 mt-2">
                                * 날짜와 위치를 먼저 선택해주세요
                            </p>
                        ) : null}
                    </div>

                    {/* Arrow Connector */}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-gray-600">
                        <ChevronRight className="w-6 h-6 rotate-90" />
                    </div>
                </div>

                {/* Step 4: Refund Info */}
                <div>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 text-black">
                            <Camera className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">단체 사진을 찍어서</h3>
                        <h3 className="text-lg font-bold mb-1">단톡방에 올려주시면</h3>
                        <h3 className="text-lg font-bold text-blue-400">환급해드려요!</h3>
                    </div>
                </div>

            </div>
        </div>
    );
}
