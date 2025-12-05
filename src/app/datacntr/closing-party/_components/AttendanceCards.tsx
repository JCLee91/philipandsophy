'use client';

import { Award, Medal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ClosingPartyStats } from '@/types/database';

interface AttendanceCardsProps {
  stats: ClosingPartyStats;
}

export default function AttendanceCards({ stats }: AttendanceCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 개근상 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-yellow-500" />
            개근상
            <Badge variant="secondary">{stats.perfectAttendance.length}명</Badge>
          </CardTitle>
          <CardDescription>
            {stats.programPeriod.totalDays}일 전부 인증한 사람
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.perfectAttendance.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.perfectAttendance.map((p) => (
                <Badge key={p.participantId} variant="outline" className="text-sm">
                  {p.participantName}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">해당자 없음</p>
          )}
        </CardContent>
      </Card>

      {/* 준개근상 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Medal className="h-5 w-5 text-gray-400" />
            준개근상
            <Badge variant="secondary">{stats.almostPerfectAttendance.length}명</Badge>
          </CardTitle>
          <CardDescription>하루만 빠지고 다 인증한 사람</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.almostPerfectAttendance.length > 0 ? (
            <div className="space-y-2">
              {stats.almostPerfectAttendance.map((p) => (
                <div key={p.participantId} className="flex items-center justify-between">
                  <Badge variant="outline" className="text-sm">
                    {p.participantName}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{p.missedDate} 미인증</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">해당자 없음</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
