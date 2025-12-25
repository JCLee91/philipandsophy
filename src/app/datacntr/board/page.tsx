'use client';

import { useEffect, useState, useMemo } from 'react';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { safeTimestampToDate } from '@/lib/datacntr/timestamp';
import { filterDatacntrParticipant } from '@/lib/datacntr/participant-filter';
import { getDb } from '@/lib/firebase';
import { ReadingSubmission, Participant, Cohort, COLLECTIONS } from '@/types/database';
import { useDatacntrStore } from '@/stores/datacntr-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, BookCheck } from 'lucide-react';
import { DatacntrPageShell } from '@/components/datacntr/layout';
import { useDatacntrAuth } from '@/hooks/datacntr';

export const dynamic = 'force-dynamic';

interface BoardData {
  participant: Participant;
  submissions: Map<string, ReadingSubmission>;
}

export default function DataCenterBoardPage() {
  const { selectedCohortId } = useDatacntrStore();
  const { isLoading: authLoading } = useDatacntrAuth();
  const [loading, setLoading] = useState(true);
  const [boardData, setBoardData] = useState<BoardData[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [cohort, setCohort] = useState<Cohort | null>(null);

  useEffect(() => {
    async function loadBoardData() {
      if (!selectedCohortId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const db = getDb();
        if (!db) return;

        // 1. Get all cohorts and find selected
        const cohortsRef = collection(db, COLLECTIONS.COHORTS);
        const cohortsSnapshot = await getDocs(cohortsRef);
        const cohortsList = cohortsSnapshot.docs.map((doc) => {
          const data = doc.data() as Cohort;
          data.id = doc.id;
          return data;
        });

        const targetCohort = cohortsList.find((c) => c.id === selectedCohortId) || null;
        if (!targetCohort) return;

        setCohort(targetCohort);

        // 2. Generate date range (날짜는 ISO 문자열 또는 Firestore Timestamp일 수 있음)
        const startDate = typeof targetCohort.startDate === 'string'
          ? parseISO(targetCohort.startDate)
          : safeTimestampToDate(targetCohort.startDate) || new Date();
        const endDate = typeof targetCohort.endDate === 'string'
          ? parseISO(targetCohort.endDate)
          : safeTimestampToDate(targetCohort.endDate) || new Date();
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
        const dateStrings = dateRange.map((date) => format(date, 'yyyy-MM-dd'));
        setDates(dateStrings);

        // 3. Get all participants (exclude admins and ghosts)
        const participantsRef = collection(db, COLLECTIONS.PARTICIPANTS);
        const participantsQuery = query(
          participantsRef,
          where('cohortId', '==', targetCohort.id),
          orderBy('name')
        );
        const participantsSnapshot = await getDocs(participantsQuery);

        const participants = participantsSnapshot.docs
          .map((doc) => {
            const data = doc.data() as Participant;
            data.id = doc.id;
            return data;
          })
          .filter((p) => filterDatacntrParticipant(p));

        // 4. Get all submissions
        const participantIds = participants.map((p) => p.id);
        const submissionsRef = collection(db, COLLECTIONS.READING_SUBMISSIONS);
        const submissions: ReadingSubmission[] = [];

        const chunkSize = 10;
        for (let i = 0; i < participantIds.length; i += chunkSize) {
          const chunk = participantIds.slice(i, i + chunkSize);
          const submissionsQuery = query(
            submissionsRef,
            where('participantId', 'in', chunk),
            where('submissionDate', '>=', targetCohort.startDate)
          );
          const snapshot = await getDocs(submissionsQuery);
          const chunkSubmissions = snapshot.docs
            .map((doc) => {
              const data = doc.data() as ReadingSubmission;
              data.id = doc.id;
              return data;
            })
            .filter((sub) => sub.submissionDate <= targetCohort.endDate)
            .filter((sub) => sub.status !== 'draft');
          submissions.push(...chunkSubmissions);
        }

        // 5. Group submissions by participant
        const submissionsByParticipant = new Map<string, Map<string, ReadingSubmission>>();
        submissions.forEach((submission) => {
          if (!submissionsByParticipant.has(submission.participantId)) {
            submissionsByParticipant.set(submission.participantId, new Map());
          }
          submissionsByParticipant.get(submission.participantId)!.set(submission.submissionDate, submission);
        });

        // 6. Build board data
        const data: BoardData[] = participants.map((participant) => ({
          participant,
          submissions: submissionsByParticipant.get(participant.id) || new Map(),
        }));

        setBoardData(data);
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }

    loadBoardData();
  }, [selectedCohortId]);

  // Statistics
  const stats = useMemo(() => {
    const totalParticipants = boardData.length;
    const totalDays = dates.length - 1;
    const totalSubmissions = boardData.reduce((sum, row) => sum + row.submissions.size, 0);

    const dailySubmissionCounts = new Map<string, number>();
    dates.forEach((date) => {
      const count = boardData.filter((row) => row.submissions.has(date)).length;
      dailySubmissionCounts.set(date, count);
    });

    return { totalParticipants, totalDays, totalSubmissions, dailySubmissionCounts };
  }, [boardData, dates]);

  if (!cohort && !loading && selectedCohortId) {
    return (
      <DatacntrPageShell title="독서 인증 현황판" isLoading={false}>
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">활성화된 기수가 없습니다.</p>
        </div>
      </DatacntrPageShell>
    );
  }

  return (
    <DatacntrPageShell
      title="독서 인증 현황판"
      description={
        cohort
          ? `${cohort.name} • ${format(
              typeof cohort.startDate === 'string'
                ? parseISO(cohort.startDate)
                : safeTimestampToDate(cohort.startDate) || new Date(),
              'M월 d일',
              { locale: ko }
            )} - ${format(
              typeof cohort.endDate === 'string'
                ? parseISO(cohort.endDate)
                : safeTimestampToDate(cohort.endDate) || new Date(),
              'M월 d일',
              { locale: ko }
            )}`
          : undefined
      }
      isLoading={authLoading || loading}
      requiresCohort
      hasCohortSelected={!!selectedCohortId}
    >
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 참가자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">프로그램 기간</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDays}일</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 인증 수</CardTitle>
            <BookCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}건</div>
            <p className="text-xs text-muted-foreground mt-1">
              평균 {stats.totalParticipants > 0 ? (stats.totalSubmissions / stats.totalParticipants).toFixed(1) : 0}
              건/인
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Board Table */}
      <Card>
        <CardHeader>
          <CardTitle>일별 인증 현황</CardTitle>
          <CardDescription>체크 표시를 클릭하면 해당 책 제목을 확인할 수 있습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-background min-w-[120px]">참가자</TableHead>
                  {dates.map((date, index) => {
                    const count = stats.dailySubmissionCounts.get(date) || 0;
                    const isFirstDay = index === 0;
                    return (
                      <TableHead key={date} className="text-center whitespace-nowrap px-2">
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{format(parseISO(date), 'M/d', { locale: ko })}</span>
                          {!isFirstDay && (
                            <span className="text-xs text-muted-foreground font-normal">({count}명)</span>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {boardData.map((row) => (
                  <TableRow key={row.participant.id}>
                    <TableCell className="sticky left-0 z-10 bg-background font-medium">
                      <div className="flex items-center gap-2">
                        <span>{row.participant.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {row.submissions.size}회
                        </Badge>
                      </div>
                    </TableCell>
                    {dates.map((date, index) => {
                      const submission = row.submissions.get(date);
                      const today = format(new Date(), 'yyyy-MM-dd');
                      const isFuture = date > today;
                      const isFirstDay = index === 0;

                      return (
                        <TableCell key={date} className="text-center px-2">
                          {isFirstDay ? (
                            <span className="inline-block text-blue-600 font-bold text-xs">OT</span>
                          ) : isFuture ? (
                            <span className="inline-block text-gray-300 font-bold text-sm">-</span>
                          ) : submission ? (
                            <span
                              className="inline-block text-green-600 font-bold text-xl cursor-help"
                              title={submission.bookTitle}
                            >
                              ✓
                            </span>
                          ) : (
                            <span className="inline-block text-red-500 font-bold text-sm">✕</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DatacntrPageShell>
  );
}
