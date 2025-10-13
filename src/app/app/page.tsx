'use client';

import PhoneAuthCard from '@/features/auth/components/PhoneAuthCard';

export default function Home() {
  return (
    <div className="app-shell flex items-center justify-center p-4">
      <PhoneAuthCard />
    </div>
  );
}
