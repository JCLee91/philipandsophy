'use client';

import Image from 'next/image';
import LandingLayout from '@/components/landing/LandingLayout';
import CtaButton from '@/components/landing/CtaButton';
import { getImageUrl, ANALYTICS_EVENTS } from '@/constants/landing';
import { useLandingConfig } from '@/hooks/use-landing-config';

// ✅ Disable static generation - providers require runtime context
export const dynamic = 'force-dynamic';

export default function PricingPage() {
    const { config, getHref } = useLandingConfig();

    return (
        <LandingLayout>
            {/* SEO Content (Hidden) */}
            <div className="seo-content">
                <h1>멤버십 가격 및 일정 안내</h1>
                <p>멤버십은 승인제로 운영되며 10분 전화 인터뷰를 통해 승인 여부가 결정돼요. 2주 독서 프로그램이 끝나면 정식 필립앤소피 멤버가 되어 다른 기수의 멤버들과 다양한 문화 생활을 즐겨요!</p>

                <h2>필립앤소피 6기 모집</h2>
                <ul>
                    <li>가격: 15만원 → <strong>12만원 (20% 할인)</strong></li>
                    <li>모집 마감: 26년 1월 1일(목)</li>
                    <li>온라인 OT: 26년 1월 3일(토)</li>
                    <li>독서 기간: 26년 1월 4일(일) - 1월 16일(금) (2주)</li>
                    <li>웰컴 파티: 26년 1월 17일(토)</li>
                </ul>

                <h3>멤버십 포함 내역</h3>
                <ol>
                    <li>멤버 전용 앱 초대</li>
                    <li>2주 독서 프로그램</li>
                    <li>즐거운 웰컴 파티 (서울 호텔 라운지 바, 핑거푸드/와인 제공)</li>
                    <li>기존 멤버 재참여 50% 할인권</li>
                    <li>멤버들과 즐기는 다양한 문화 생활</li>
                    <li>월간 프라이빗 멤버스 이벤트</li>
                </ol>

                <h2>자주 묻는 질문 (FAQ)</h2>
                <h3>Q. 어떤 사람들이 참여하나요?</h3>
                <p>필립앤소피에는 가벼운 스몰토크보다 깊이 있는 대화와 진정성 있는 관계를 좋아하는 분들이 모여있어요. 대기업, 전문직, 공기업, 스타트업, 크리에이터 등 다양한 분야에서 활동 중인 2030 멤버들이 서로를 존중하며 교류합니다.</p>

                <h3>Q. 웰컴 파티 비용은 별도인가요?</h3>
                <p>최초 결제한 참가비에 모두 포함되어 있으니 편하게 오셔서 즐기시면 됩니다.</p>

                <h3>Q. 인증을 많이 못하면 불이익이 있나요?</h3>
                <p>서로의 생각을 알아가는 과정이 중요하기 때문에 몇 가지 규칙이 있어요.</p>
                <ul>
                    <li>총 13일 중 4일 이상 생각을 남겨주셔야만 정식 멤버로 승인돼요.</li>
                    <li>활동이 전혀 없으면 웰컴 파티 참여가 불가능해요.</li>
                    <li>위 경우 환불은 어렵지만, 재참여 시 50% 할인을 해드려요.</li>
                </ul>

                <h3>Q. 2주 프로그램이 끝나면 어떻게 되나요?</h3>
                <p>필립앤소피 멤버로 활동하며 모든 기수의 멤버들과 함께 다양한 문화 생활을 즐기실 수 있어요.</p>

                <p>더이상 소모적인 만남에 시간을 낭비하지 마세요. 당신의 매력은 결이 맞는 사람들 속에서 가장 빛납니다. 필립앤소피에서 생각이 통하는 인연을 만나보세요.</p>
            </div>

            <div className="container p-0 max-w-[500px] mx-auto">
                <Image
                    src={getImageUrl('/image/pricing/PnS_Pricing_1.webp?v=1765966010156')}
                    alt="가격 안내 1 - 멤버십 가격 및 포함 내역"
                    width={1170}
                    height={2000}
                    className="main-image"
                    priority
                />
                <Image
                    src={getImageUrl('/image/pricing/PnS_Pricing_2.webp?v=1765966010156')}
                    alt="가격 안내 2 - 자주 묻는 질문(FAQ)"
                    width={1170}
                    height={2000}
                    className="main-image"
                />

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
