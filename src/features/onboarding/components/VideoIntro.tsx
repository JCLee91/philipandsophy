'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface VideoIntroProps {
  src: string;
  onComplete: () => void;
}

export default function VideoIntro({ src, onComplete }: VideoIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      onComplete();
    };

    video.addEventListener('ended', handleEnded);
    
    // Play explicit
    video.play().catch(() => {
       // handle autoplay failure
    });
    
    return () => video.removeEventListener('ended', handleEnded);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
    >
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-contain"
        playsInline
        muted
        autoPlay
      />
    </motion.div>
  );
}
