'use client';

import { Trophy, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UnifiedButton } from '@/components/common';
import { Separator } from '@/components/ui/separator';
import type { Cohort } from '@/types/database';
import { useSocializingAdmin } from '../hooks/use-socializing-admin';
import PhaseStepper from './admin/PhaseStepper';
import PhaseIdle from './admin/PhaseIdle';
import PhaseOptionVote from './admin/PhaseOptionVote';
import PhaseAttendanceCheck from './admin/PhaseAttendanceCheck';
import PhaseConfirmed from './admin/PhaseConfirmed';
import ParticipantListDialog from './ParticipantListDialog';

interface SocializingAdminControlsProps {
  cohort: Cohort;
  onUpdate?: () => void;
}

export default function SocializingAdminControls({ cohort, onUpdate }: SocializingAdminControlsProps) {
  const admin = useSocializingAdmin({ cohort, onUpdate });

  return (
    <Card className="w-full transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-muted-foreground" />
            <CardTitle>애프터 다이닝 관리</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <UnifiedButton
              variant="ghost"
              size="sm"
              onClick={admin.handleReset}
              disabled={admin.isPending}
              className="text-muted-foreground h-8"
              icon={<RefreshCw className="w-3 h-3" />}
            >
              초기화
            </UnifiedButton>
            <UnifiedButton
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 hover:bg-gray-100 transition-colors"
              onClick={() => admin.setIsExpanded(!admin.isExpanded)}
            >
              {admin.isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </UnifiedButton>
          </div>
        </div>

        {admin.isExpanded && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-300">
            <CardDescription>
              애프터 다이닝의 진행 단계를 관리하고 투표 현황을 모니터링합니다.
            </CardDescription>
            <PhaseStepper currentPhaseIndex={admin.currentPhaseIndex} />
          </div>
        )}
      </CardHeader>

      {admin.isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <Separator />
          <CardContent className="pt-6">
            {admin.currentPhase === 'idle' && (
              <PhaseIdle
                selectedDates={admin.selectedDates}
                setSelectedDates={admin.setSelectedDates}
                selectedTime={admin.selectedTime}
                setSelectedTime={admin.setSelectedTime}
                selectedLocations={admin.selectedLocations}
                toggleLocation={admin.toggleLocation}
                customLocation={admin.customLocation}
                setCustomLocation={admin.setCustomLocation}
                addCustomLocation={admin.addCustomLocation}
                totalCombinations={admin.totalCombinations}
                deadlineHours={admin.deadlineHours}
                setDeadlineHours={admin.setDeadlineHours}
                estimatedDeadline={admin.estimatedDeadline}
                isPending={admin.isPending}
                onStartVoting={admin.handleStartVoting}
              />
            )}

            {admin.currentPhase === 'option_vote' && (
              <PhaseOptionVote
                cohort={cohort}
                stats={admin.stats}
                selectedWinnerId={admin.selectedWinnerId}
                setSelectedWinnerId={admin.setSelectedWinnerId}
                deadlineHours={admin.deadlineHours}
                setDeadlineHours={admin.setDeadlineHours}
                isPending={admin.isPending}
                getTopVote={admin.getTopVote}
                onRefreshStats={admin.handleRefreshStats}
                onStartAttendanceCheck={admin.handleStartAttendanceCheck}
                openVoterDialog={admin.openVoterDialog}
              />
            )}

            {admin.currentPhase === 'attendance_check' && (
              <PhaseAttendanceCheck
                cohort={cohort}
                stats={admin.stats}
                isPending={admin.isPending}
                onRefreshStats={admin.handleRefreshStats}
                onConfirm={admin.handleConfirm}
                openVoterDialog={admin.openVoterDialog}
              />
            )}

            {admin.currentPhase === 'confirmed' && (
              <PhaseConfirmed
                cohort={cohort}
                openChatUrl={admin.openChatUrl}
                setOpenChatUrl={admin.setOpenChatUrl}
                isPending={admin.isPending}
                onUpdateUrl={admin.handleUpdateUrl}
              />
            )}
          </CardContent>
        </div>
      )}

      <ParticipantListDialog
        open={admin.isParticipantDialogOpen}
        onOpenChange={admin.setIsParticipantDialogOpen}
        title={admin.dialogTitle}
        voters={admin.dialogVoters}
      />
    </Card>
  );
}
