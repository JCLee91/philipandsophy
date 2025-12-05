'use client';

import { Calendar as CalendarIcon, Clock, MapPin, CheckCircle, UserCheck, UserX, Link } from 'lucide-react';
import { UnifiedButton } from '@/components/common';
import { Input } from '@/components/ui/input';
import type { Cohort } from '@/types/database';

interface PhaseConfirmedProps {
  cohort: Cohort;
  openChatUrl: string;
  setOpenChatUrl: (url: string) => void;
  isPending: boolean;
  onUpdateUrl: () => void;
}

export default function PhaseConfirmed({
  cohort,
  openChatUrl,
  setOpenChatUrl,
  isPending,
  onUpdateUrl,
}: PhaseConfirmedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle className="w-6 h-6 text-green-600" />
      </div>
      <div className="space-y-1">
        <h3 className="font-bold text-lg">모임 확정 완료</h3>
        <p className="text-sm text-muted-foreground">애프터 다이닝 일정이 확정되었습니다.</p>
      </div>

      {cohort.socializingResult && (
        <div className="w-full space-y-3">
          <div className="flex gap-4 text-sm border p-3 rounded-lg bg-muted/20 justify-center">
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{cohort.socializingResult.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{cohort.socializingResult.time}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{cohort.socializingResult.location}</span>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-600" />
              <span>참석 {cohort.socializingResult.attendees?.length || 0}명</span>
            </div>
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-gray-400" />
              <span>불참 {cohort.socializingResult.absentees?.length || 0}명</span>
            </div>
          </div>
        </div>
      )}

      {/* 오픈카톡방 URL 설정 */}
      <div className="w-full mt-6 border-t pt-6">
        <div className="flex flex-col space-y-2 text-left">
          <label className="text-sm font-medium flex items-center gap-2">
            <Link className="w-4 h-4" /> 오픈카톡방 URL 설정
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="https://open.kakao.com/..."
              value={openChatUrl}
              onChange={(e) => setOpenChatUrl(e.target.value)}
            />
            <UnifiedButton onClick={onUpdateUrl} disabled={isPending} loading={isPending} size="sm">
              저장
            </UnifiedButton>
          </div>
          <p className="text-xs text-muted-foreground">
            * 입력한 URL은 모임 하루 전부터 사용자에게 입장하기 버튼으로 노출됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
