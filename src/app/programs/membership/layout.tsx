import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '멤버십 프로그램 | 필립앤소피',
    description: '검증된 멤버들과 즐기는 도심 속 다양한 문화 생활. 프로필 북으로 서로를 미리 알아보고, 전시, 공연, 파티 등 엄선된 이벤트를 함께 즐겨보세요.',
    openGraph: {
        title: '멤버십 프로그램 | 필립앤소피',
        description: '검증된 멤버들과 즐기는 도심 속 다양한 문화 생활. 프로필 북으로 서로를 미리 알아보고, 전시, 공연, 파티 등 엄선된 이벤트를 함께 즐겨보세요.',
    },
};

export default function MembershipLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
