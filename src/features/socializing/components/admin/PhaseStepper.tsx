'use client';

import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHASES, PHASE_LABELS, type SocializingPhase } from '../../constants/socializing-constants';

interface PhaseStepperProps {
  currentPhaseIndex: number;
}

export default function PhaseStepper({ currentPhaseIndex }: PhaseStepperProps) {
  return (
    <div className="flex items-center justify-between mt-6 relative">
      <div className="absolute top-1/2 left-0 w-full h-px bg-border -z-10" />
      {PHASES.map((phase, idx) => {
        const isActive = idx === currentPhaseIndex;
        const isCompleted = idx < currentPhaseIndex;
        return (
          <div key={phase} className="flex flex-col items-center gap-2 bg-background px-2">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isCompleted
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground text-muted-foreground bg-background'
              )}
            >
              {isCompleted ? <CheckCircle className="w-3 h-3" /> : idx + 1}
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {PHASE_LABELS[phase as SocializingPhase]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
