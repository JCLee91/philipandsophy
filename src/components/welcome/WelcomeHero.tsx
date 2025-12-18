'use client';

import { motion } from 'framer-motion';

interface WelcomeHeroProps {
  participantName: string;
  cohortName: string;
}

export default function WelcomeHero({ participantName, cohortName }: WelcomeHeroProps) {
  return (
    <section className="relative w-full min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500 rounded-full blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Cohort badge */}
          {cohortName && (
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full">
              {cohortName}
            </span>
          )}

          {/* Welcome message */}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            안녕하세요{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              {participantName}
            </span>
            님!
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-2">
            승인제 독서소셜클럽 <strong className="text-white">필립앤소피</strong>입니다.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="mt-8"
        >
          <p className="text-xl md:text-2xl text-white font-medium">
            인터뷰 결과,
          </p>
          <p className="text-xl md:text-2xl text-white mt-2">
            필립앤소피 <span className="text-amber-400 font-semibold">정식 멤버</span>로 초대되셨어요!
          </p>
          <p className="text-gray-400 mt-4 text-base md:text-lg">
            저희 클럽의 멤버가 되신 걸 진심으로 환영합니다
          </p>
        </motion.div>
      </div>
    </section>
  );
}
