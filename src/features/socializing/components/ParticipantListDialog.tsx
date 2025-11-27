'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { VoterInfo } from '@/features/socializing/actions/socializing-actions';

interface ParticipantListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  voters: VoterInfo[];
}

export default function ParticipantListDialog({
  open,
  onOpenChange,
  title,
  voters
}: ParticipantListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 border-b border-gray-100">
          <DialogTitle className="text-lg font-bold text-center text-gray-900">
            {title} ({voters.length}명)
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {voters.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              참여자가 없습니다.
            </div>
          ) : (
            <ul className="space-y-3">
              {voters.map((voter) => (
                <li key={voter.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-gray-100">
                    <AvatarImage src={voter.profileImageCircle || undefined} alt={voter.name} />
                    <AvatarFallback className="bg-gray-100 text-gray-500 text-xs">
                      {voter.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-gray-900 text-sm">
                    {voter.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

