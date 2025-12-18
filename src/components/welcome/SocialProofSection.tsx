'use client';

import { motion } from 'framer-motion';

interface SocialProofSectionProps {
  memberCount?: number;
  applicantCount?: number;
  genderRatio?: { male: number; female: number };
}

export default function SocialProofSection({
  memberCount = 350,
  applicantCount = 1200,
  genderRatio = { male: 5, female: 5 },
}: SocialProofSectionProps) {
  return (
    <section className="relative w-full bg-black py-12 mt-0 overflow-hidden">
      <div className="relative z-10 max-w-[500px] mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 gap-y-16"
        >
          <div className="text-center px-4 md:px-12 border-r border-white/10">
            <h3 className="text-gray-400 text-sm md:text-base mb-2 font-medium">누적 지원자 수</h3>
            <div className="text-3xl font-bold text-white tracking-tight whitespace-nowrap">
              {applicantCount.toLocaleString()}명+
            </div>
          </div>

          <div className="text-center px-4 md:px-12">
            <h3 className="text-gray-400 text-sm md:text-base mb-2 font-medium">승인된 멤버</h3>
            <div className="text-3xl font-bold text-library-blue tracking-tight whitespace-nowrap">
              {memberCount.toLocaleString()}명+
            </div>
          </div>

          <div className="text-center px-4 md:px-12 border-r border-white/10">
            <h3 className="text-gray-400 text-sm md:text-base mb-2 font-medium">남자 멤버</h3>
            <div className="text-3xl font-bold text-white tracking-tight whitespace-nowrap">
              {genderRatio.male}명+
            </div>
          </div>

          <div className="text-center px-4 md:px-12">
            <h3 className="text-gray-400 text-sm md:text-base mb-2 font-medium">여자 멤버</h3>
            <div className="text-3xl font-bold text-white tracking-tight whitespace-nowrap">
              {genderRatio.female}명+
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
