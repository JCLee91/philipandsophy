'use client';

import { Loader2, Check } from 'lucide-react';
import UnifiedButton from '@/components/UnifiedButton';
import type { MatchingResponse } from '@/types/matching';

interface Participant {
  id: string;
  name?: string;
}

interface MatchingPreviewProps {
  /** 매칭 결과 데이터 */
  previewResult: MatchingResponse;
  /** 참가자 목록 (이름 매핑용) */
  participants: Participant[];
  /** 처리 중 여부 */
  isProcessing: boolean;
  /** 확정 버튼 클릭 핸들러 */
  onConfirm: () => void;
}

/**
 * 매칭 프리뷰 컴포넌트
 *
 * V2(랜덤 매칭)와 V3(클러스터 매칭) 결과를 모두 표시합니다.
 */
export default function MatchingPreview({
  previewResult,
  participants,
  isProcessing,
  onConfirm,
}: MatchingPreviewProps) {
  return (
    <div className="mt-6 border-t border-gray-200 pt-6 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            매칭 미리보기
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({previewResult.date}, 총 {previewResult.totalParticipants}명)
            </span>
          </h3>
          {previewResult.matching.matchingVersion === 'cluster' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
              V3 AI 클러스터 매칭
            </span>
          )}
          {previewResult.matching.matchingVersion === 'random' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
              V2 랜덤 매칭
            </span>
          )}
        </div>
        <UnifiedButton
          variant="primary"
          onClick={onConfirm}
          disabled={isProcessing}
          className="bg-green-600 hover:bg-green-700 text-white"
          icon={<Check className="h-4 w-4" />}
        >
          이 결과로 확정하기
        </UnifiedButton>
      </div>

      {/* V3 클러스터 뷰 */}
      {previewResult.matching.clusters && (
        <ClusterView
          clusters={previewResult.matching.clusters}
          participants={participants}
        />
      )}

      {/* V2 랜덤 매칭 뷰 (Legacy Support) */}
      {!previewResult.matching.clusters && previewResult.matching.assignments && (
        <RandomMatchingView
          assignments={previewResult.matching.assignments}
          participants={participants}
        />
      )}
    </div>
  );
}

interface ClusterViewProps {
  clusters: Record<string, {
    id: string;
    name: string;
    emoji: string;
    theme: string;
    reasoning: string;
    memberIds: string[];
  }>;
  participants: Participant[];
}

function ClusterView({ clusters, participants }: ClusterViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.values(clusters).map((cluster) => (
        <div
          key={cluster.id}
          className="p-4 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{cluster.emoji}</span>
            <div>
              <h4 className="font-bold text-gray-900">{cluster.name}</h4>
              <p className="text-xs text-gray-500">{cluster.theme}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3 bg-white p-2 rounded border border-gray-100">
            {cluster.reasoning}
          </p>
          <div className="flex flex-wrap gap-2">
            {cluster.memberIds.map((memberId) => {
              const member = participants.find((p) => p.id === memberId);
              return (
                <span
                  key={memberId}
                  className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700"
                >
                  {member?.name || 'Unknown'}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

interface RandomMatchingViewProps {
  assignments: Record<string, { assigned?: string[] }>;
  participants: Participant[];
}

function RandomMatchingView({ assignments, participants }: RandomMatchingViewProps) {
  const entries = Object.entries(assignments);

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              참가자
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              매칭된 파트너
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries.slice(0, 10).map(([id, assignment]) => {
            const member = participants.find((p) => p.id === id);
            const assignedIds = assignment.assigned || [];

            return (
              <tr key={id}>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {member?.name || id}
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {assignedIds
                    .map((aid) => {
                      const partner = participants.find((p) => p.id === aid);
                      return partner?.name || aid;
                    })
                    .join(', ')}
                </td>
              </tr>
            );
          })}
          {entries.length > 10 && (
            <tr>
              <td colSpan={2} className="px-4 py-2 text-center text-xs text-gray-400">
                ... 외 {entries.length - 10}명
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
