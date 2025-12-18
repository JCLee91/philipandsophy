import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '가격 및 일정 안내 | 필립앤소피',
    description: '필립앤소피 멤버십 6기 모집 안내. 2주 독서 프로그램, 웰컴 파티, 멤버 전용 앱 초대 등 포함된 멤버십 혜택과 가격을 확인하세요.',
    openGraph: {
        title: '가격 및 일정 안내 | 필립앤소피',
        description: '필립앤소피 멤버십 6기 모집 안내. 2주 독서 프로그램, 웰컴 파티, 멤버 전용 앱 초대 등 포함된 멤버십 혜택과 가격을 확인하세요.',
    },
};

export default function PricingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
