'use client';

import PageTransition from '@/components/PageTransition';
import TopBar from '@/components/TopBar';
import LoadingSkeleton from '@/components/today-library/common/LoadingSkeleton';
import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';
import { useAuth } from '@/contexts/AuthContext';

export default function PartyAuthGate({ children }: { children: React.ReactNode }) {
  const { participant, participantStatus, isLoading: authLoading } = useAuth();

  if (authLoading || participantStatus === 'loading') {
    return <LoadingSkeleton title="월간 멤버스 파티" />;
  }

  if (!participant) {
    return (
      <PageTransition>
        <div className="app-shell flex flex-col overflow-hidden bg-[#F6F6F6] min-h-screen">
          <TopBar
            title="월간 멤버스 파티"
            align="center"
            className="bg-white border-b-0"
          />
          <main className="flex-1 flex items-center justify-center px-6 py-10">
            <PhoneAuthCard />
          </main>
        </div>
      </PageTransition>
    );
  }

  return children;
}

