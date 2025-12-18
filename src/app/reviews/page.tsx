'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import LandingLayout from '@/components/landing/LandingLayout';
import SocialProofSection from '@/components/welcome/SocialProofSection';
import CtaButton from '@/components/landing/CtaButton';
import { getImageUrl, ANALYTICS_EVENTS } from '@/constants/landing';
import { useLandingConfig } from '@/hooks/use-landing-config';
import MemberShowcase from '@/components/welcome/MemberShowcase';

// ✅ Disable static generation - providers require runtime context
export const dynamic = 'force-dynamic';

import Script from 'next/script';
import { PARTY_REVIEWS_SCHEMA } from '@/constants/seo';

// 통계 데이터 (하드코딩)
const STATS = {
    applicants: 550,
    members: 330,
    female: 180,
    male: 150,
};

interface MemberData {
    id: string;
    profileImage: string | null;
}

export default function ReviewsPage() {
    const { config, getHref } = useLandingConfig();
    const [members, setMembers] = useState<MemberData[]>([]);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const res = await fetch('/api/welcome/members');
                if (res.ok) {
                    const data = await res.json();
                    setMembers(data.showcase || []);
                    setTotalCount(data.total || 0);
                }
            } catch (error) {
                // 멤버 로드 실패 시 캐러셀만 숨김
            }
        };
        fetchMembers();
    }, []);

    return (
        <LandingLayout>
            {/* JSON-LD Structured Data */}
            <Script id="json-ld-reviews" type="application/ld+json" strategy="afterInteractive">
                {JSON.stringify(PARTY_REVIEWS_SCHEMA)}
            </Script>

            {/* SEO Content (Hidden) */}
            <div className="seo-content">
                <h1>멤버 후기 - 좋은 사람들과 함께하는 특별한 경험</h1>
                <div className="review-list">
                    <div className="review-item">
                        <h2>기회가 될 때마다 참여하고 싶어요!</h2>
                        <p className="tags">약국 / 약사</p>
                        <p>어떻게 이런 분들을 다 모으셨는지? 싶을 정도로 좋은 분들이 너무 많았어요.</p>
                    </div>
                    <div className="review-item">
                        <h2>세심한 디테일이 느껴지는 2주였습니다.</h2>
                        <p className="tags">스타트업 / 대표</p>
                        <p>완성도 높은 컨셉과 기획이었어요. 매우 만족스러운 경험이었습니다.</p>
                    </div>
                    <div className="review-item">
                        <h2>오랫동안 함께하고 싶은 커뮤니티!</h2>
                        <p className="tags">SK하이닉스 / 연구직</p>
                        <p>가치관이 비슷한 분들과 깊은 이야기를 나눌 수 있었어요.</p>
                    </div>
                </div>
            </div>

            {/* 히어로 이미지 */}
            <div className="container p-0 max-w-[500px] mx-auto">
                <Image
                    src={getImageUrl('/image/reviews/PnS_Review.webp?v=1734510000000')}
                    alt="멤버 후기 - 좋은 사람들과 함께하는 특별한 경험"
                    width={1170}
                    height={813}
                    className="main-image !mb-5"
                    priority
                />
            </div>

            {/* 프로필카드 캐러셀 - 헤딩/푸터 숨김 */}
            {members.length > 0 && (
                <>
                    <MemberShowcase
                        members={members}
                        totalCount={totalCount}
                        showHeader={false}
                        showFooter={false}
                    />
                    <p className="text-center text-gray-600 text-xs mt-3 mb-4">
                        * 개인정보 보호를 위해 실제 멤버 대신 AI 생성 이미지를 사용했습니다
                    </p>
                </>
            )}

            {/* Spacer for clear visual separation */}


            {/* 통계 섹션 - Social Proof (Relocated Below) */}
            <SocialProofSection
                applicantCount={STATS.applicants}
                memberCount={STATS.members}
                genderRatio={{ male: STATS.male, female: STATS.female }}
            />

            {/* Spacer for clear visual separation */}
            <div className="h-8 w-full bg-black" />

            {/* Additional Review Image */}
            <div className="container p-0 max-w-[500px] mx-auto">
                <Image
                    src={getImageUrl('/image/reviews/PnS_Review_2.webp?v=1734510000000')}
                    alt="멤버 후기 상세"
                    width={1170}
                    height={5103}
                    className="main-image"
                />
            </div>

            {/* CTA 버튼 */}
            <div className="container p-0 max-w-[500px] mx-auto">
                {config && (
                    <CtaButton
                        analyticsName={ANALYTICS_EVENTS.HOME}
                        ariaLabel="사전 신청 설문 열기"
                        text={config.ctaText}
                        floatingText={config.floatingText}
                        href={getHref()}
                    />
                )}
            </div>
        </LandingLayout>
    );
}
