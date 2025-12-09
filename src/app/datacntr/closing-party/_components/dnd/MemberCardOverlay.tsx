'use client';

import { GripVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ClosingPartyGroupMember } from '@/types/database';

interface MemberCardOverlayProps {
  member: ClosingPartyGroupMember;
}

export default function MemberCardOverlay({ member }: MemberCardOverlayProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background border-2 border-primary rounded-lg shadow-lg">
      <GripVertical className="h-4 w-4 text-primary shrink-0" />
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={member.profileImageCircle} alt={member.name} />
        <AvatarFallback className="text-xs">{member.name.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{member.name}</p>
      </div>
    </div>
  );
}
