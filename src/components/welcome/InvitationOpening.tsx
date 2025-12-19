'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface InvitationOpeningProps {
    name: string;
    welcomeMessage?: string | null;
}

export default function InvitationOpening({ name, welcomeMessage }: InvitationOpeningProps) {
    // 성 빼고 이름만 (예: 정재환 → 재환)
    const firstName = name.length > 1 ? name.slice(1) : name;

    const scrollToNext = () => {
        window.scrollTo({
            top: window.innerHeight,
            behavior: 'smooth'
        });
    };

    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center px-4 bg-black">
            {/* Subtle ambient glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="relative z-10 text-center max-w-[500px]"
            >
                {/* Main greeting */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight"
                >
                    환영합니다, {firstName}님
                </motion.h1>

                {/* Approval message */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                >
                    <p className="text-xl md:text-2xl text-gray-300 font-light leading-relaxed">
                        인터뷰 결과,
                    </p>
                    <p className="text-xl md:text-2xl text-[#62bbff] font-medium leading-relaxed">
                        필립앤소피 멤버로 초대되셨어요!
                    </p>

                    {/* AI 맞춤 메시지 - 편지 스타일 */}
                    {welcomeMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
                            className="mt-12 mx-auto max-w-md"
                        >
                            <div className="relative px-8 py-8 bg-gradient-to-b from-white/[0.04] to-transparent rounded-xl">
                                {/* 상단 장식 */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <div className="w-8 h-8 rounded-full bg-[#62bbff]/20 flex items-center justify-center">
                                        <span className="text-[#62bbff] text-lg">✦</span>
                                    </div>
                                </div>

                                <p className="text-base text-gray-300/90 font-light leading-[2] text-left italic">
                                    {welcomeMessage}
                                </p>

                                {/* 서명 */}
                                <p className="mt-6 text-right text-sm text-gray-500">
                                    — 필립앤소피 드림
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* 기본 환영 멘트 */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: welcomeMessage ? 1.2 : 0.9, ease: [0.16, 1, 0.3, 1] }}
                        className="text-lg text-gray-400 font-light leading-relaxed mt-8"
                    >
                        저희 소셜클럽의 멤버가 되신 걸<br />
                        진심으로 환영합니다.
                    </motion.p>
                </motion.div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.button
                onClick={scrollToNext}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 text-gray-500"
                aria-label="스크롤하여 계속 보기"
            >
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <ChevronDown className="w-8 h-8" />
                </motion.div>
            </motion.button>
        </section>
    );
}
