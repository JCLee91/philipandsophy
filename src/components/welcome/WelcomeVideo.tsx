'use client';

import { motion } from 'framer-motion';

export default function WelcomeVideo() {
  return (
    <section className="relative w-full bg-black py-12 md:py-16">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Video container with aspect ratio */}
          <div className="relative w-full aspect-[9/16] md:aspect-video bg-gray-900">
            <video
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              poster="/image/landing/hero_bg_1.png"
            >
              <source src="/video/mockup.mp4" type="video/mp4" />
              영상을 재생할 수 없습니다.
            </video>
          </div>

          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </motion.div>

        {/* Caption */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center text-gray-500 text-sm mt-4"
        >
          필립앤소피 멤버들의 모임 현장
        </motion.p>
      </div>
    </section>
  );
}
