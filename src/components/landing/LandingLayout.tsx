'use client';

import { ReactNode } from 'react';
import Footer from '@/components/Footer';
import GlassNavigation from './GlassNavigation';
import PartyFloatingButton from './PartyFloatingButton';
import '../../styles/landing.css';

interface LandingLayoutProps {
  children: ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="landing-page">
      {/* Glassmorphism Navigation */}
      <GlassNavigation />

      {/* Page Content */}
      {children}

      {/* Party Floating Button */}
      <PartyFloatingButton />

      {/* Footer */}
      <Footer />
    </div>
  );
}
