'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { ReadingSubmission, Participant, Cohort } from '@/types/database';
import { logger } from '@/lib/logger';

interface BoardData {
  participant: Participant;
  submissions: Map<string, ReadingSubmission>; // key: YYYY-MM-DD
}

export default function DataCenterBoardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [boardData, setBoardData] = useState<BoardData[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [cohort, setCohort] = useState<Cohort | null>(null);

  useEffect(() => {
    async function loadBoardData() {
      try {
        setLoading(true);

        const db = getDb();
        if (!db) {
          logger.error('Firebase DB not initialized');
          return;
        }

        // 1. Get active cohort
        const cohortsRef = collection(db, 'cohorts');
        const cohortQuery = query(cohortsRef, where('isActive', '==', true));
        const cohortSnapshot = await getDocs(cohortQuery);

        if (cohortSnapshot.empty) {
          logger.error('No active cohort found');
          return;
        }

        const activeCohort = cohortSnapshot.docs[0].data() as Cohort;
        activeCohort.id = cohortSnapshot.docs[0].id;
        setCohort(activeCohort);

        // 2. Generate date range
        const startDate = parseISO(activeCohort.startDate);
        const endDate = parseISO(activeCohort.endDate);
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
        const dateStrings = dateRange.map((date) => format(date, 'yyyy-MM-dd'));
        setDates(dateStrings);

        // 3. Get all participants (exclude only super admins, include general admins)
        const participantsRef = collection(db, 'participants');
        const participantsQuery = query(
          participantsRef,
          where('cohortId', '==', activeCohort.id),
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

        // 4. Get all submissions for this cohort
        const submissionsRef = collection(db, 'reading_submissions');
        const submissionsQuery = query(
          submissionsRef,
          where('submissionDate', 'in', dateStrings)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);

        const submissions = submissionsSnapshot.docs.map((doc) => {
          const data = doc.data() as ReadingSubmission;
          data.id = doc.id;
          return data;
        });

        // 5. Group submissions by participant
        const submissionsByParticipant = new Map<string, Map<string, ReadingSubmission>>();

        submissions.forEach((submission) => {
          if (!submissionsByParticipant.has(submission.participantId)) {
            submissionsByParticipant.set(submission.participantId, new Map());
          }
          submissionsByParticipant
            .get(submission.participantId)!
            .set(submission.submissionDate, submission);
        });

        // 6. Build board data
        const data: BoardData[] = participants.map((participant) => ({
          participant,
          submissions: submissionsByParticipant.get(participant.id) || new Map(),
        }));

        setBoardData(data);
      } catch (error) {
        logger.error('Failed to load board data', error);
      } finally {
        setLoading(false);
      }
    }

    loadBoardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="shimmer h-12 w-12 rounded-full mx-auto mb-4" />
          <p className="text-gray-600">독서 인증 현황을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">활성화된 기수가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">독서 인증 현황판</h1>
          <p className="mt-2 text-sm text-gray-600">
            {cohort.name} ({format(parseISO(cohort.startDate), 'M월 d일', { locale: ko })} -{' '}
            {format(parseISO(cohort.endDate), 'M월 d일', { locale: ko })})
          </p>
        </div>

        {/* Board Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  참가자
                </th>
                {dates.map((date) => (
                  <th
                    key={date}
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {format(parseISO(date), 'M/d', { locale: ko })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {boardData.map((row) => (
                <tr key={row.participant.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.participant.name}
                  </td>
                  {dates.map((date) => {
                    const submission = row.submissions.get(date);
                    return (
                      <td
                        key={date}
                        className="px-3 py-4 whitespace-nowrap text-center text-2xl"
                      >
                        {submission ? (
                          <span className="text-green-500" title={submission.bookTitle}>
                            ✅
                          </span>
                        ) : (
                          <span className="text-gray-300">❌</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">총 참가자</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{boardData.length}명</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">프로그램 기간</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{dates.length}일</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">총 인증 수</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {boardData.reduce((sum, row) => sum + row.submissions.size, 0)}건
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
