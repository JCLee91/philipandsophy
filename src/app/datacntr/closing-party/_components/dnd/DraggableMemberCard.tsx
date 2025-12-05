'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ClosingPartyGroupMember } from '@/types/database';

interface DraggableMemberCardProps {
  member: ClosingPartyGroupMember;
  groupId: string;
}

export default function DraggableMemberCard({ member, groupId }: DraggableMemberCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${groupId}-${member.participantId}`,
    data: { member, groupId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 p-2 bg-background border rounded-lg cursor-grab active:cursor-grabbing hover:border-primary transition-colors"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={member.profileImageCircle} alt={member.name} />
        <AvatarFallback className="text-xs">{member.name.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <p className="flex-1 text-sm font-medium truncate">{member.name}</p>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {member.submissionCount || 0}회
      </span>
    </div>
  );
}
