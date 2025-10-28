'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { ReadingSubmission, Participant, Cohort } from '@/types/database';
import { logger } from '@/lib/logger';
import { useDatacntrStore } from '@/stores/datacntr-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, BookCheck } from 'lucide-react';

// ✅ Disable static generation - requires runtime data
export const dynamic = 'force-dynamic';
interface BoardData {
  participant: Participant;
  submissions: Map<string, ReadingSubmission>; // key: YYYY-MM-DD
}

export default function DataCenterBoardPage() {
  const router = useRouter();
  const { selectedCohortId } = useDatacntrStore();
  const [loading, setLoading] = useState(true);
  const [boardData, setBoardData] = useState<BoardData[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [allCohorts, setAllCohorts] = useState<Cohort[]>([]);

  useEffect(() => {
    async function loadBoardData() {
      try {
        setLoading(true);

        const db = getDb();
        if (!db) {

          return;
        }

        // 1. Get cohorts
        const cohortsRef = collection(db, 'cohorts');
        const cohortsSnapshot = await getDocs(cohortsRef);
        const cohortsList = cohortsSnapshot.docs.map(doc => {
          const data = doc.data() as Cohort;
          data.id = doc.id;
          return data;
        });
        setAllCohorts(cohortsList);

        // 2. Select cohort based on global filter
        let targetCohort: Cohort | null = null;
        if (selectedCohortId === 'all') {
          // 'all'이면 활성 기수
          targetCohort = cohortsList.find(c => c.isActive) || cohortsList[0] || null;
        } else {
          // 선택된 기수
          targetCohort = cohortsList.find(c => c.id === selectedCohortId) || null;
        }

        if (!targetCohort) {

          return;
        }

        setCohort(targetCohort);

        // 3. Generate date range
        const startDate = parseISO(targetCohort.startDate);
        const endDate = parseISO(targetCohort.endDate);
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
        const dateStrings = dateRange.map((date) => format(date, 'yyyy-MM-dd'));
        setDates(dateStrings);

        // 4. Get all participants (exclude only super admins, include general admins)
        const participantsRef = collection(db, 'participants');
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
          .filter((p) => !p.isSuperAdmin); // Exclude only super admins

        // 5. Get all submissions for this cohort's participants
        // NOTE: reading_submissions doesn't have cohortId field, so we query by participantId
        const participantIds = participants.map(p => p.id);
        const submissionsRef = collection(db, 'reading_submissions');

        const submissions: ReadingSubmission[] = [];

        // Firestore IN constraint: max 30 items per query (using 10 for safety)
        const chunkSize = 10;
        for (let i = 0; i < participantIds.length; i += chunkSize) {
          const chunk = participantIds.slice(i, i + chunkSize);
          // Query with IN + single range filter, then filter in memory for end date
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
            // Filter end date in memory to avoid complex index requirement
            .filter((sub) => sub.submissionDate <= targetCohort.endDate);
          submissions.push(...chunkSubmissions);
        }

        // 6. Group submissions by participant
        const submissionsByParticipant = new Map<string, Map<string, ReadingSubmission>>();

        submissions.forEach((submission) => {
          if (!submissionsByParticipant.has(submission.participantId)) {
            submissionsByParticipant.set(submission.participantId, new Map());
          }
          submissionsByParticipant
            .get(submission.participantId)!
            .set(submission.submissionDate, submission);
        });

        // 7. Build board data
        const data: BoardData[] = participants.map((participant) => ({
          participant,
          submissions: submissionsByParticipant.get(participant.id) || new Map(),
        }));

        setBoardData(data);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    }

    loadBoardData();
  }, [selectedCohortId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="shimmer h-12 w-12 rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">독서 인증 현황을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">활성화된 기수가 없습니다.</p>
        </div>
      </div>
    );
  }

  // Calculate statistics (첫 날 OT 제외)
  const totalParticipants = boardData.length;
  const totalDays = dates.length - 1; // 첫 날(OT) 제외
  const totalSubmissions = boardData.reduce((sum, row) => sum + row.submissions.size, 0);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">독서 인증 현황판</h1>
          <p className="text-muted-foreground">
            {cohort.name} • {format(parseISO(cohort.startDate), 'M월 d일', { locale: ko })} -{' '}
            {format(parseISO(cohort.endDate), 'M월 d일', { locale: ko })}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 참가자</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalParticipants}명</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">프로그램 기간</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDays}일</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 인증 수</CardTitle>
              <BookCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSubmissions}건</div>
              <p className="text-xs text-muted-foreground mt-1">
                평균 {(totalSubmissions / totalParticipants).toFixed(1)}건/인
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Board Table */}
        <Card>
          <CardHeader>
            <CardTitle>일별 인증 현황</CardTitle>
            <CardDescription>
              체크 표시를 클릭하면 해당 책 제목을 확인할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-background min-w-[120px]">
                      참가자
                    </TableHead>
                    {dates.map((date) => (
                      <TableHead key={date} className="text-center whitespace-nowrap px-2">
                        {format(parseISO(date), 'M/d', { locale: ko })}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boardData.map((row) => {
                    const completionRate = (row.submissions.size / (dates.length - 1)) * 100; // OT 제외
                    return (
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
                          const isFirstDay = index === 0; // 첫 날은 OT

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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
