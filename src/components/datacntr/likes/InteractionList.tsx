'use client';

import { InteractionPair } from '@/types/datacntr';
import { ArrowRight, Heart } from 'lucide-react';

interface InteractionListProps {
    pairs: InteractionPair[];
}

export default function InteractionList({ pairs }: InteractionListProps) {
    return (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" fill="currentColor" />
                    상호작용 순위 (Top 10)
                </h3>
            </div>

            {pairs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                    데이터 없음
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {pairs.map((pair, index) => (
                        <div key={`${pair.giverId}-${pair.receiverId}`} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={`flex-shrink-0 w-5 text-center font-bold text-xs ${index < 3 ? 'text-pink-600' : 'text-gray-400'
                                    }`}>{index + 1}</span>

                                <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                                    <span className="font-medium text-gray-900 truncate">{pair.giverName}</span>
                                    <span className="text-gray-400 flex-shrink-0">→</span>
                                    <span className="font-medium text-gray-900 truncate">{pair.receiverName}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                                <div className="bg-pink-50 text-pink-600 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <Heart className="w-3 h-3" fill="currentColor" />
                                    {pair.count}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
