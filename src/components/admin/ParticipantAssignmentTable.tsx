'use client';

import { Loader2, Users } from 'lucide-react';
import { CARD_STYLES } from '@/constants/ui';

interface Target {
  id: string;
  name: string;
}

interface AssignmentRow {
  viewerId: string;
  viewerName: string;
  similarTargets: Target[];
  oppositeTargets: Target[];
}

interface ParticipantAssignmentTableProps {
  assignmentRows: AssignmentRow[];
  participantsLoading: boolean;
  onOpenProfile: (participantId: string, theme: 'similar' | 'opposite') => void;
}

export default function ParticipantAssignmentTable({
  assignmentRows,
  participantsLoading,
  onOpenProfile,
}: ParticipantAssignmentTableProps) {
  return (
    <div className={CARD_STYLES.CONTAINER}>
      {/* 헤더 */}
      <div className={`flex items-center justify-between ${CARD_STYLES.HEADER}`}>
        <h3 className="font-bold text-admin-text-primary">오늘의 프로필북 현황</h3>
        <span className="text-sm font-medium text-admin-text-secondary">
          총 {assignmentRows.length}명
        </span>
      </div>

      {/* 테이블 컨테이너 */}
      <div className="overflow-x-auto">
        {participantsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-admin-brand" />
          </div>
        ) : assignmentRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-admin-text-secondary mb-3" />
            <p className="text-sm text-admin-text-tertiary font-semibold">추천 데이터가 없습니다</p>
            <p className="text-xs text-admin-text-secondary mt-1">매칭을 시작하면 여기에 결과가 표시됩니다</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-admin-bg-gray border-b border-admin-border">
                <th className="px-4 py-3 text-center text-sm font-bold text-admin-text-primary whitespace-nowrap">
                  참가자
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-admin-text-primary whitespace-nowrap">
                  비슷한 가치관 (2명)
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-admin-text-primary whitespace-nowrap">
                  반대 가치관 (2명)
                </th>
              </tr>
            </thead>
            <tbody>
              {assignmentRows.map((row, index) => (
                <tr
                  key={row.viewerId}
                  className={`border-b border-admin-border transition-colors hover:bg-admin-bg-hover ${
                    index % 2 === 0 ? 'bg-admin-bg-card' : 'bg-admin-bg-stripe'
                  }`}
                >
                  {/* 참가자 이름 */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button
                      type="button"
                      className="font-semibold text-sm text-admin-text-primary hover:underline hover:text-admin-brand focus:outline-none focus:underline"
                      onClick={() => onOpenProfile(row.viewerId, 'similar')}
                      aria-label={`${row.viewerName} 프로필 보기`}
                    >
                      {row.viewerName}
                    </button>
                  </td>

                  {/* 비슷한 가치관 */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {row.similarTargets.length > 0 ? (
                      <div className="inline-flex items-center gap-2 text-sm text-admin-text-tertiary">
                        {row.similarTargets.map((target, idx) => (
                          <span key={target.id} className="inline-flex items-center">
                            <button
                              type="button"
                              className="hover:underline hover:text-admin-brand focus:outline-none focus:underline px-1"
                              onClick={() => onOpenProfile(target.id, 'similar')}
                              aria-label={`${target.name} 프로필 보기`}
                            >
                              {target.name}
                            </button>
                            {idx < row.similarTargets.length - 1 && <span className="text-admin-text-secondary">,</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-admin-text-secondary">-</p>
                    )}
                  </td>

                  {/* 반대 가치관 */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {row.oppositeTargets.length > 0 ? (
                      <div className="inline-flex items-center gap-2 text-sm text-admin-text-tertiary">
                        {row.oppositeTargets.map((target, idx) => (
                          <span key={target.id} className="inline-flex items-center">
                            <button
                              type="button"
                              className="hover:underline hover:text-admin-brand-warning focus:outline-none focus:underline px-1"
                              onClick={() => onOpenProfile(target.id, 'opposite')}
                              aria-label={`${target.name} 프로필 보기`}
                            >
                              {target.name}
                            </button>
                            {idx < row.oppositeTargets.length - 1 && <span className="text-admin-text-secondary">,</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-admin-text-secondary">-</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
