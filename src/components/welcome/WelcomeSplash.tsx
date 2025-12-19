'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function WelcomeSplash() {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-3xl" />
      </div>

      {/* Logo with fade-in animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        <Image
          src="/image/pns_logo_text_white.png"
          alt="Philip & Sophy"
          width={220}
          height={73}
          className="object-contain"
          priority
        />
      </motion.div>
    </div>
  );
}
