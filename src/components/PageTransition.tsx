'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

const pageTransition = {
  duration: 0.3, // 300ms (duration-slow와 동일)
  ease: [0.16, 1, 0.3, 1], // ease-out (--ease-out과 동일)
};

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        style={{ pointerEvents: 'auto' }} // 애니메이션 중에도 클릭 이벤트 허용
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
