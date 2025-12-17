import { TopReceiver } from '@/types/datacntr';
import { Trophy, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TopLikersListProps {
    receivers: TopReceiver[];
    isLoading: boolean;
}

export default function TopLikersList({ receivers, isLoading }: TopLikersListProps) {
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
                <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                            <Skeleton className="h-4 w-12" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-full shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-pink-50 rounded-lg">
                    <Trophy className="w-5 h-5 text-pink-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">인기 멤버 TOP 5</h3>
            </div>

            <div className="space-y-4">
                {receivers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        아직 받은 좋아요가 없습니다
                    </div>
                ) : (
                    receivers.map((receiver, index) => (
                        <div
                            key={receiver.userId}
                            className="flex items-center justify-between group p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                  ${index === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200' :
                                        index === 1 ? 'bg-gray-100 text-gray-700' :
                                            index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'}
                `}>
                                    {index + 1}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-900">{receiver.userName}</span>
                                    {index === 0 && <span className="text-xs text-pink-500 font-medium">Most Loved!</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-pink-50 text-pink-600 rounded-full text-sm font-medium">
                                <span className="text-xs">❤️</span>
                                {receiver.count.toLocaleString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
