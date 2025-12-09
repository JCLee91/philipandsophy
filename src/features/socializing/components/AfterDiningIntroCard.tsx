'use client';

import { Users, Gift, ArrowRight, Wine } from 'lucide-react';
import UnifiedButton from '@/components/UnifiedButton';

interface AfterDiningIntroCardProps {
    onNext: () => void;
}

export default function AfterDiningIntroCard({ onNext }: AfterDiningIntroCardProps) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 text-center">
            <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-3 text-white shadow-lg shadow-gray-200 relative">
                    <Wine className="w-6 h-6 absolute left-1.5 top-3.5 rotate-15" />
                    <Wine className="w-6 h-6 absolute right-1.5 top-3.5 -rotate-15" />
                </div>
                <h3 className="text-heading-lg font-bold text-text-primary">애프터 다이닝</h3>
                <p className="text-sm text-text-secondary mt-3 whitespace-pre-line leading-relaxed">
                    같은 기수의 참가자들과 다시 한 번<br />
                    만날 수 있는 자리가 마련돼요.
                </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-4 text-left mb-6 border border-gray-100">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-xs border border-gray-100 shrink-0">
                        <Users className="w-4 h-4 text-gray-900" />
                    </div>
                    <div>
                        <span className="font-medium text-text-primary block">동기들과의 재회</span>
                        <span className="text-sm text-text-secondary">
                            같은 기수의 멤버들과 더 깊은 교류를 나눌 수 있어요.
                        </span>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-xs border border-gray-100 shrink-0">
                        <Gift className="w-4 h-4 text-gray-900" />
                    </div>
                    <div>
                        <span className="font-medium text-text-primary block">소셜링 지원금</span>
                        <span className="text-sm text-text-secondary">
                            참여하시는 모든 멤버들에게<br />
                            인당 5,000원의 소셜링 지원금이 지급돼요.
                        </span>
                    </div>
                </div>
            </div>

            <UnifiedButton
                fullWidth
                onClick={onNext}
                variant="primary"
                className="group flex items-center justify-center"
            >
                일정 선택하기
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </UnifiedButton>
        </div>
    );
}

