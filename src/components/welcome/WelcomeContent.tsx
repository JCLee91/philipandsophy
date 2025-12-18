'use client';

import { motion } from 'framer-motion';
import { BookOpen, Users, Calendar, MessageCircle } from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: '독서 인증',
    description: '2주간 매일 읽은 책의 구절을 기록하고 공유해요',
  },
  {
    icon: Users,
    title: '소셜링 모임',
    description: '같은 기수 멤버들과 오프라인에서 만나요',
  },
  {
    icon: Calendar,
    title: '다양한 활동',
    description: '전시회, 영화, 와인파티 등 함께 즐겨요',
  },
  {
    icon: MessageCircle,
    title: '프로필북',
    description: '멤버들의 프로필을 확인하고 소통해요',
  },
];

export default function WelcomeContent() {
  return (
    <section className="w-full bg-black py-12 md:py-16">
      <div className="max-w-2xl mx-auto px-4">
        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            이런 활동을 함께해요
          </h2>
          <p className="text-gray-400">
            필립앤소피에서 경험할 수 있는 것들
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-amber-500/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                  <p className="text-gray-500 text-sm">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Placeholder for future content images */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 text-sm">
            더 자세한 프로그램 안내는 입금 확인 후 전달드려요
          </p>
        </motion.div>
      </div>
    </section>
  );
}
