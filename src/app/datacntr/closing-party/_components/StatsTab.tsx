'use client';

import {
  Sun,
  Moon,
  BookOpen,
  PenLine,
  MessageCircle,
  Users,
  FileText,
  Award,
  Medal,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ClosingPartyStats } from '@/types/database';
import { formatTimestamp } from '../_lib/types';
import AwardCard from './AwardCard';
import AttendanceCards from './AttendanceCards';

interface StatsTabProps {
  stats: ClosingPartyStats;
}

export default function StatsTab({ stats }: StatsTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">총 참가자</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalParticipants}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">총 인증</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalSubmissions}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">개근</span>
            </div>
            <p className="text-2xl font-bold">{stats.perfectAttendance.length}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Medal className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">준개근</span>
            </div>
            <p className="text-2xl font-bold">{stats.almostPerfectAttendance.length}명</p>
          </CardContent>
        </Card>
      </div>

      {/* Award Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AwardCard
          icon={<Sun className="h-5 w-5 text-orange-500" />}
          title="얼리버드상"
          description="가장 일찍 인증한 사람"
          winner={stats.earliestSubmitter}
          detail={
            stats.earliestSubmitter
              ? `${stats.earliestSubmitter.submissionTime} (${stats.earliestSubmitter.submissionDate})`
              : null
          }
        />
        <AwardCard
          icon={<Moon className="h-5 w-5 text-indigo-500" />}
          title="올빼미상"
          description="마감 직전에 인증한 사람"
          winner={stats.latestSubmitter}
          detail={
            stats.latestSubmitter
              ? `${stats.latestSubmitter.submissionTime} (${stats.latestSubmitter.submissionDate})`
              : null
          }
        />
        <AwardCard
          icon={<BookOpen className="h-5 w-5 text-green-500" />}
          title="다독왕"
          description="가장 많은 책을 읽은 사람"
          winner={stats.mostBooksReader}
          detail={stats.mostBooksReader ? `${stats.mostBooksReader.uniqueBookCount}권` : null}
          subDetail={
            stats.mostBooksReader
              ? stats.mostBooksReader.bookTitles.slice(0, 3).join(', ') +
                (stats.mostBooksReader.bookTitles.length > 3 ? '...' : '')
              : null
          }
        />
        <AwardCard
          icon={<PenLine className="h-5 w-5 text-blue-500" />}
          title="감상평왕"
          description="가장 긴 감상평을 쓴 사람"
          winner={stats.longestReviewWriter}
          detail={
            stats.longestReviewWriter
              ? `평균 ${stats.longestReviewWriter.averageLength}자`
              : null
          }
        />
        <AwardCard
          icon={<MessageCircle className="h-5 w-5 text-purple-500" />}
          title="가치관왕"
          description="가장 긴 답변을 쓴 사람"
          winner={stats.longestAnswerWriter}
          detail={
            stats.longestAnswerWriter
              ? `평균 ${stats.longestAnswerWriter.averageLength}자`
              : null
          }
        />
      </div>

      {/* 개근상 & 준개근상 */}
      <AttendanceCards stats={stats} />

      {/* Footer */}
      <div className="flex justify-end">
        <div className="text-sm text-muted-foreground">
          마지막 계산: {stats.calculatedAt && formatTimestamp(stats.calculatedAt)}
          {' • '}
          {stats.calculatedBy === 'scheduled' ? '자동' : '수동'}
        </div>
      </div>
    </div>
  );
}
