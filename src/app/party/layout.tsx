import type { Metadata } from 'next';
import PartyAuthGate from './PartyAuthGate';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nocache: true,
    },
  },
};

export default function PartyLayout({ children }: { children: React.ReactNode }) {
  return <PartyAuthGate>{children}</PartyAuthGate>;
}
