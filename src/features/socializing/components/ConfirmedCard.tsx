'use client';

import { Calendar, Clock, MapPin, PartyPopper, Users, MessageCircle, Link } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { VoterInfo } from '@/features/socializing/actions/socializing-actions';
import { useState } from 'react';
import ParticipantListDialog from './ParticipantListDialog';
import UnifiedButton from '@/components/UnifiedButton';
import { cn } from '@/lib/utils';

interface ConfirmedCardProps {
    result: {
        cohortId?: string;
        optionId: string;
        date: string;
        time: string;
        location: string;
    };
    attendingVoters?: VoterInfo[];
    openChatUrl?: string | null;
}

function formatSafeDate(dateString: string): string {
    try {
        const date = parseISO(dateString);
        if (!isValid(date)) return dateString;
        return format(date, 'M월 d일 (EEE)', { locale: ko });
    } catch {
        return dateString;
    }
}

export default function ConfirmedCard({ result, attendingVoters = [], openChatUrl }: ConfirmedCardProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // D-1 계산 (모임 하루 전 00:00부터 활성화)
    const meetingDate = parseISO(result.date);
    const now = new Date();
    const oneDayBefore = new Date(meetingDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(0, 0, 0, 0);

    const isButtonActive = !!openChatUrl && now >= oneDayBefore;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 text-center">
            <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-3 text-white shadow-lg shadow-gray-200">
                    <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-heading-lg font-bold text-text-primary">애프터 다이닝 일정 확정</h3>
                <p className="text-sm text-text-secondary mt-3 whitespace-pre-line leading-relaxed">
                    모임 하루 전 오픈카톡방<br/>
                    입장 버튼이 활성화됩니다.
                </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-left mb-6 border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-xs border border-gray-100">
                        <Calendar className="w-4 h-4 text-gray-900" />
                    </div>
                    <span className="font-medium text-text-primary">
                        {formatSafeDate(result.date)}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-xs border border-gray-100">
                        <Clock className="w-4 h-4 text-gray-900" />
                    </div>
                    <span className="font-medium text-text-primary">
                        {result.time}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-xs border border-gray-100">
                        <MapPin className="w-4 h-4 text-gray-900" />
                    </div>
                    <span className="font-medium text-text-primary">
                        {result.location}
                    </span>
                </div>
            </div>

            {/* 참석 예정자 */}
            <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 text-left">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-900" />
                    <span className="font-bold text-text-primary">참석 예정</span>
                    <span className="font-bold text-gray-900 ml-1">{attendingVoters.length}명</span>
                </div>
                {attendingVoters.length > 0 && (
                    <button 
                        onClick={() => setIsDialogOpen(true)}
                        className="text-sm text-gray-500 hover:text-gray-900 underline"
                    >
                        참여자 보기
                    </button>
                )}
            </div>

            <ParticipantListDialog 
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                title="참석 예정 멤버"
                voters={attendingVoters}
            />

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                {/* 오픈카톡방 입장 버튼 */}
                <div className="space-y-2">
                    <UnifiedButton
                        fullWidth
                        variant="primary"
                        onClick={() => openChatUrl && window.open(openChatUrl, '_blank')}
                        disabled={!isButtonActive}
                        className={cn(
                            "flex items-center justify-center font-medium transition-all h-12",
                            !isButtonActive && "opacity-50 cursor-not-allowed bg-gray-200 text-gray-500 hover:bg-gray-200 border-gray-200"
                        )}
                    >
                        <Link className="w-4 h-4 mr-2" />
                        {isButtonActive ? '오픈카톡방 입장하기' : '오픈카톡방 입장 대기'}
                    </UnifiedButton>
                    {!isButtonActive && (
                        <p className="text-xs text-gray-400 text-center">
                            * 모임 하루 전부터 입장 가능합니다.
                        </p>
                    )}
                </div>

                {/* 문의하기 */}
                <div className="pt-6 border-t border-gray-100">
                    <p className="text-sm text-text-secondary mb-4 leading-relaxed whitespace-pre-line">
                        일정 변경으로 인해 추가 참석을 원하시거나<br/>
                        불참하시게 되는 분들은<br/>
                        아래 버튼을 통해 카카오톡 채널로 꼭 알려주세요.
                    </p>
                    <UnifiedButton
                        variant="outline"
                        onClick={() => window.open('http://pf.kakao.com/_QPNUn/chat', '_blank')}
                        className="bg-[#FEE500] border-[#FEE500] text-[#191919] hover:bg-[#E6CF00] flex items-center justify-center font-medium text-sm px-6 py-2.5 h-auto rounded-full mx-auto"
                    >
                        <MessageCircle className="w-4 h-4 mr-1.5" />
                        카카오톡 채널로 문의하기
                    </UnifiedButton>
                </div>
            </div>
        </div>
    );
}
