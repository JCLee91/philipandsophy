'use client';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { UsersRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ClosingPartyGroup } from '@/types/database';
import DraggableMemberCard from './DraggableMemberCard';

const TIER_LABEL = {
  active: '활발',
  moderate: '보통',
  inactive: '저조',
  mixed: '혼합',
};

const TIER_COLOR = {
  active: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-600',
  mixed: 'bg-blue-100 text-blue-700',
};

interface DroppableGroupCardProps {
  group: ClosingPartyGroup;
  isDropTarget: boolean;
}

export default function DroppableGroupCard({ group, isDropTarget }: DroppableGroupCardProps) {
  return (
    <Card
      className={`transition-all ${
        isDropTarget ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            {group.groupNumber}조
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={TIER_COLOR[group.tier]}>
              {TIER_LABEL[group.tier]}
            </Badge>
            <Badge variant="secondary">{group.members?.length || 0}명</Badge>
          </div>
        </CardTitle>
        {group.averageAffinity > 0 && (
          <CardDescription>평균 친밀도: {group.averageAffinity}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <SortableContext
          items={(group.members || []).map((m) => `${group.groupId}-${m.participantId}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {(group.members || []).map((member) => (
              <DraggableMemberCard
                key={member.participantId}
                member={member}
                groupId={group.groupId}
              />
            ))}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}
