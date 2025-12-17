'use client';

import { useState } from 'react';
import { MostLikedSubmission } from '@/types/datacntr';
import { BookOpen, MapPin, ThumbsUp, Quote } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ContentStatsProps {
    typeStats?: { review: number; answer: number };
    mostLikedReviews?: MostLikedSubmission[];
    mostLikedAnswers?: MostLikedSubmission[];
}

export default function ContentStats({ typeStats, mostLikedReviews, mostLikedAnswers }: ContentStatsProps) {
    const [selectedSubmission, setSelectedSubmission] = useState<MostLikedSubmission | null>(null);

    const total = (typeStats?.review || 0) + (typeStats?.answer || 0);
    const reviewPercent = total > 0 ? Math.round(((typeStats?.review || 0) / total) * 100) : 0;
    const answerPercent = total > 0 ? Math.round(((typeStats?.answer || 0) / total) * 100) : 0;

    const renderList = (title: string, data?: MostLikedSubmission[], icon?: React.ReactNode) => (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    {icon} {title}
                </h3>
            </div>

            <div className="divide-y divide-gray-100">
                {(!data || data.length === 0) ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                        아직 데이터가 충분하지 않습니다.
                    </div>
                ) : data.map((sub, index) => (
                    <div
                        key={sub.submissionId}
                        className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                        onClick={() => setSelectedSubmission(sub)}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`mt-1 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                    index === 1 ? 'bg-gray-100 text-gray-700' :
                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                            'text-gray-500 bg-gray-50'}`}>
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-900">{sub.userName}</span>
                                    <div className="flex items-center gap-1 text-pink-500 text-xs font-bold bg-pink-50 px-2 py-0.5 rounded-full">
                                        <ThumbsUp className="w-3 h-3" />
                                        <span>{sub.likeCount}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2 group-hover:text-gray-900 transition-colors">
                                    {sub.contentPreview}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <>
            <div className="space-y-6">
                {/* 1. 콘텐츠 타입 비중 (Bar) */}
                <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">유형별 비중</h3>
                    <div className="flex h-4 rounded-full overflow-hidden">
                        <div style={{ width: `${reviewPercent}%` }} className="bg-blue-500" title={`감상평: ${reviewPercent}%`} />
                        <div style={{ width: `${answerPercent}%` }} className="bg-orange-500" title={`가치관: ${answerPercent}%`} />
                    </div>
                    <div className="flex justify-between mt-2 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-gray-600">감상평 ({typeStats?.review || 0})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            <span className="text-gray-600">가치관 ({typeStats?.answer || 0})</span>
                        </div>
                    </div>
                </div>

                {/* 2. 인기 게시물 (Split) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderList(
                        "감상평 순위 (Top 10)",
                        mostLikedReviews,
                        <BookOpen className="w-5 h-5 text-blue-600" />
                    )}
                    {renderList(
                        "가치관 순위 (Top 10)",
                        mostLikedAnswers,
                        <MapPin className="w-5 h-5 text-orange-600" />
                    )}
                </div>
            </div>

            {/* 상세 보기 모달 */}
            <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedSubmission?.targetType === 'review' ? (
                                selectedSubmission.isDailyRetrospective ? (
                                    <>
                                        {/* 회고일 때 배지 표시 */}
                                        {/* (아이콘은 선택사항, BookOpen 그대로 쓰거나 변경) */}
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-purple-600" />
                                            <span className="text-gray-900">하루 회고</span>
                                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold">
                                                Retrospective
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <BookOpen className="w-5 h-5 text-blue-600" />
                                        <span className="text-gray-900">독서 인증</span>
                                    </>
                                )
                            ) : (
                                <>
                                    <MapPin className="w-5 h-5 text-orange-600" />
                                    <span className="text-gray-900">가치관 질문</span>
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                                    {selectedSubmission?.userName.slice(0, 1)}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900">{selectedSubmission?.userName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-pink-500 bg-pink-50 px-3 py-1 rounded-full">
                                <ThumbsUp className="w-4 h-4" />
                                <span className="font-bold">{selectedSubmission?.likeCount} Likes</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl relative">
                            <Quote className="w-8 h-8 text-gray-200 absolute top-4 left-4 -z-0" />

                            {selectedSubmission?.dailyQuestion && (
                                <div className="relative z-10 mb-4 pb-4 border-b border-gray-200/50">
                                    <p className="text-sm font-bold text-gray-900 mb-1">Q. {selectedSubmission.dailyQuestion}</p>
                                </div>
                            )}

                            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap relative z-10">
                                {selectedSubmission?.fullContent || selectedSubmission?.contentPreview}
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
