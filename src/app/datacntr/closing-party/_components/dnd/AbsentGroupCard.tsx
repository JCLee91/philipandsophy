'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { UserX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ClosingPartyGroup } from '@/types/database';
import DraggableMemberCard from './DraggableMemberCard';

interface AbsentGroupCardProps {
  group: ClosingPartyGroup | undefined;
  isDropTarget: boolean;
}

export default function AbsentGroupCard({ group, isDropTarget }: AbsentGroupCardProps) {
  const members = group?.members || [];

  const { setNodeRef } = useDroppable({
    id: 'absent-drop-zone',
  });

  return (
    <Card
      ref={setNodeRef}
      className={`border-dashed transition-all ${
        isDropTarget
          ? 'ring-2 ring-destructive ring-offset-2 bg-destructive/5'
          : 'border-muted-foreground/30'
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg text-muted-foreground">
          <span className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            불참조
          </span>
          <Badge variant="outline" className="text-muted-foreground">
            {members.length}명
          </Badge>
        </CardTitle>
        <CardDescription>파티에 참석하지 않는 인원</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length > 0 ? (
          <SortableContext
            items={members.map((m) => `absent-${m.participantId}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <DraggableMemberCard
                  key={member.participantId}
                  member={member}
                  groupId="absent"
                />
              ))}
            </div>
          </SortableContext>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            불참자를 이 곳으로 드래그하세요
          </p>
        )}
      </CardContent>
    </Card>
  );
}
