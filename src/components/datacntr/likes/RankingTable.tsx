'use client';

import { TopGiver, TopReceiver } from '@/types/datacntr';

interface RankingTableProps {
    title: string;
    data: TopReceiver[] | TopGiver[];
    icon: React.ReactNode;
    colorClass: string;
}

export default function RankingTable({ title, data, icon, colorClass }: RankingTableProps) {
    return (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-gray-50 ${colorClass}`}>
                    {icon}
                </div>
                <h3 className="font-bold text-gray-900">{title}</h3>
            </div>

            {data.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                    아직 데이터가 충분하지 않습니다.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full relative">
                        <thead className="bg-gray-50/50 sticky top-0 z-10 bg-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">순위</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">좋아요 수</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((item, index) => (
                                <tr key={item.userId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                index === 1 ? 'bg-gray-100 text-gray-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-700' :
                                                        'text-gray-500'}`}
                                        >
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {item.userName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                                        {item.count}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
