'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fadeIn } from '@/features/application';

export default function PartyClosedPage() {
    const router = useRouter();

    return (
        <div className="application-page">
            <div className="application-container">
                {/* 상단 로고 */}
                <motion.header className="application-header" {...fadeIn}>
                    <div className="application-logo">
                        <Image
                            src="/image/pns_logo_symbol.png"
                            alt="Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </motion.header>

                {/* 메인 콘텐츠 */}
                <main className="application-content">
                    <motion.div
                        className="text-center flex flex-col items-center justify-center gap-6"
                        {...fadeIn}
                    >

                        {/* 메시지 */}
                        <div className="space-y-3">
                            <h1 className="text-2xl font-bold text-white">
                                신청이 마감되었습니다
                            </h1>
                            <p className="text-gray-400 text-base leading-relaxed">
                                12월 멤버스 파티 신청이 마감되었습니다.<br />
                                다음 모임에서 만나요!
                            </p>
                        </div>

                        {/* 홈으로 돌아가기 버튼 */}
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="cta-button-white mt-4"
                        >
                            홈으로 돌아가기
                        </button>
                    </motion.div>
                </main>

                {/* 하단 로고 */}
                <motion.footer className="application-footer" {...fadeIn}>
                    <div className="application-footer-logo">
                        <Image
                            src="/image/pns_logo_text_white.png"
                            alt="Philip & Sophy"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </motion.footer>
            </div>
        </div>
    );
}

