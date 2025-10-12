'use client';

import { Loader2, Users } from 'lucide-react';
import UnifiedButton from '@/components/UnifiedButton';

interface Target {
  id: string;
  name: string;
}

interface AssignmentRow {
  viewerId: string;
  viewerName: string;
  viewerOccupation?: string;
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
    <div className="bg-white rounded-xl border border-[#dddddd] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#31363e]">참가자별 추천 현황</h3>
        <span className="text-xs font-medium text-[#8f98a3]">
          총 {assignmentRows.length}명
        </span>
      </div>

      {participantsLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-[#45a1fd]" />
        </div>
      ) : assignmentRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Users className="h-12 w-12 text-[#8f98a3] mb-3" />
          <p className="text-sm text-[#575e68] font-semibold">추천 데이터가 없습니다</p>
          <p className="text-xs text-[#8f98a3] mt-1">매칭을 시작하면 여기에 결과가 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignmentRows.map((row) => (
            <div
              key={row.viewerId}
              className="rounded-lg border border-[#dddddd] bg-[#eff6ff] p-3 space-y-2 transition-all duration-normal hover:shadow-md hover:border-[#cee7ff]"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-[#31363e]">
                  {row.viewerName}
                </p>
                <UnifiedButton
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenProfile(row.viewerId, 'similar')}
                >
                  프로필 보기
                </UnifiedButton>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-semibold mb-1 text-[#45a1fd]">비슷한 가치관</p>
                  {row.similarTargets.length > 0 ? (
                    <div className="space-y-0.5">
                      {row.similarTargets.map((target) => (
                        <button
                          key={`${row.viewerId}-similar-${target.id}`}
                          type="button"
                          className="text-left hover:underline text-[#575e68] focus:outline-none focus:ring-2 focus:ring-[#45a1fd]"
                          onClick={() => onOpenProfile(target.id, 'similar')}
                          aria-label={`${target.name} 프로필 보기`}
                        >
                          • {target.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#8f98a3]">없음</p>
                  )}
                </div>

                <div>
                  <p className="font-semibold mb-1 text-[#ffd362]">반대 가치관</p>
                  {row.oppositeTargets.length > 0 ? (
                    <div className="space-y-0.5">
                      {row.oppositeTargets.map((target) => (
                        <button
                          key={`${row.viewerId}-opposite-${target.id}`}
                          type="button"
                          className="text-left hover:underline text-[#575e68] focus:outline-none focus:ring-2 focus:ring-[#ffd362]"
                          onClick={() => onOpenProfile(target.id, 'opposite')}
                          aria-label={`${target.name} 프로필 보기`}
                        >
                          • {target.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#8f98a3]">없음</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
