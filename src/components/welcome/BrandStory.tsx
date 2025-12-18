'use client';

import { motion } from 'framer-motion';
import { Video, BookOpen, PartyPopper } from 'lucide-react';

// 6기 프로그램 일정
const timeline = [
    {
        date: '1/3 (금) 오후 2시',
        title: '온라인 오리엔테이션',
        desc: 'Zoom으로 진행하는 간단한 인사와 프로그램 안내',
        icon: Video,
    },
    {
        date: '1/4 ~ 1/16',
        title: '2주 독서 프로그램',
        desc: '하루 10분, 매일 생각을 기록하고 멤버들과 공유',
        icon: BookOpen,
    },
    {
        date: '1/17 (금) 저녁 6시',
        title: '웰컴 파티',
        desc: '서울 시내 프라이빗 라운지에서 멤버들과 직접 만남',
        icon: PartyPopper,
    },
];

const afterProgram = [
    {
        title: '정규 멤버 승격',
        desc: '2주 프로그램을 완료하면 커뮤니티 정규 멤버가 됩니다',
    },
    {
        title: '문화생활 플랫폼',
        desc: '멤버 전용 앱에서 전시, 공연, 와인 모임 등 함께할 멤버 모집',
    },
    {
        title: '다른 기수와 교류',
        desc: '검증된 멤버들과의 자유로운 네트워킹',
    },
    {
        title: '월간 프라이빗 멤버스 이벤트',
        desc: '매달 열리는 정기 모임과 특별 이벤트 초대',
    },
];

export default function BrandStory() {
    return (
        <section className="w-full bg-black py-20 md:py-28 px-6">
            <div className="max-w-lg mx-auto">
                {/* Section 1: Program Timeline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                    className="mb-10"
                >
                    <span className="text-gray-500 text-sm font-medium tracking-widest uppercase block mb-4">
                        6기 Schedule
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                        앞으로의 일정
                    </h2>
                </motion.div>

                {/* Timeline */}
                <div className="relative pl-6 border-l border-gray-800 space-y-8 mb-16">
                    {timeline.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{
                                duration: 0.5,
                                delay: index * 0.1,
                                ease: [0.16, 1, 0.3, 1]
                            }}
                            className="relative"
                        >
                            {/* Timeline dot */}
                            <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-[#62bbff]" />

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                    <item.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-sm mb-1">{item.date}</p>
                                    <h3 className="text-lg font-semibold text-white mb-1">
                                        {item.title}
                                    </h3>
                                    <p className="text-gray-400 text-base leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Section 2: After Program */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                    className="mb-8"
                >
                    <span className="text-gray-500 text-sm font-medium tracking-widest uppercase block mb-4">
                        After Program
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                        프로그램 이후에는
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 gap-4">
                    {afterProgram.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{
                                duration: 0.5,
                                delay: index * 0.1,
                                ease: [0.16, 1, 0.3, 1]
                            }}
                            className="p-4 rounded-xl bg-white/5"
                        >
                            <h3 className="text-base font-semibold text-white mb-1">
                                {item.title}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
