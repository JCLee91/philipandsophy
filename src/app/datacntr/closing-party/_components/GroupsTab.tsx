'use client';

import {
  DndContext,
  DragOverlay,
  closestCenter,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core';
import { RefreshCw, Shuffle, UsersRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { UnifiedButton } from '@/components/common';
import type { ClosingPartyGroupMember } from '@/types/database';
import type { GroupsResponse } from '../_lib/types';
import { formatTimestamp } from '../_lib/types';
import DroppableGroupCard from './dnd/DroppableGroupCard';
import AbsentGroupCard from './dnd/AbsentGroupCard';
import MemberCardOverlay from './dnd/MemberCardOverlay';

interface GroupsTabProps {
  groupsLoading: boolean;
  groupsData: GroupsResponse | null;
  formingGroups: boolean;
  activeMember: { member: ClosingPartyGroupMember; groupId: string } | null;
  overGroupId: string | null;
  sensors: SensorDescriptor<SensorOptions>[];
  onFormGroups: () => void;
  onDragStart: (event: any) => void;
  onDragOver: (event: any) => void;
  onDragEnd: (event: any) => void;
}

export default function GroupsTab({
  groupsLoading,
  groupsData,
  formingGroups,
  activeMember,
  overGroupId,
  sensors,
  onFormGroups,
  onDragStart,
  onDragOver,
  onDragEnd,
}: GroupsTabProps) {
  if (groupsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!groupsData?.groups) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <UsersRound className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">조 편성이 아직 되지 않았습니다</p>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            {groupsData?.hasClusterData
              ? '클러스터 매칭 데이터를 기반으로 친밀도가 높은 사람들끼리 조가 편성됩니다.'
              : '인증 횟수가 비슷한 사람들끼리 조가 편성됩니다.'}
          </p>
          <UnifiedButton
            onClick={onFormGroups}
            disabled={formingGroups}
            loading={formingGroups}
            loadingText="편성 중..."
            icon={<Shuffle className="h-4 w-4" />}
          >
            조 편성하기
          </UnifiedButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-6">
        {/* 안내 메시지 */}
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          💡 멤버를 드래그하여 다른 조로 이동할 수 있습니다. 불참자는 불참조로 이동하세요.
        </div>

        {/* 조 목록 (불참조 제외) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupsData.groups
            .filter((group) => group.groupId !== 'absent')
            .map((group) => (
              <DroppableGroupCard
                key={group.groupId}
                group={group}
                isDropTarget={overGroupId === group.groupId && activeMember?.groupId !== group.groupId}
              />
            ))}
        </div>

        {/* 불참조 */}
        <AbsentGroupCard
          group={groupsData.groups.find((g) => g.groupId === 'absent')}
          isDropTarget={overGroupId === 'absent' && activeMember?.groupId !== 'absent'}
        />

        {/* Footer */}
        <div className="flex justify-end">
          <div className="text-sm text-muted-foreground">
            {groupsData.groupFormationAt && (
              <>편성일: {formatTimestamp(groupsData.groupFormationAt)}</>
            )}
            {groupsData.hasClusterData ? ' • 친밀도 기반' : ' • 인증횟수 기반'}
          </div>
        </div>
      </div>

      {/* 드래그 오버레이 */}
      <DragOverlay>
        {activeMember ? <MemberCardOverlay member={activeMember.member} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
