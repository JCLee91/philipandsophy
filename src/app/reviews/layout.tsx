import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '멤버 후기 | 필립앤소피',
    description: '약사, 스타트업 대표, 대기업 연구원 등 다양한 직군의 멤버들이 남긴 필립앤소피 리얼 후기. 좋은 사람들과 함께하는 특별한 경험을 확인해보세요.',
    openGraph: {
        title: '멤버 후기 | 필립앤소피',
        description: '약사, 스타트업 대표, 대기업 연구원 등 다양한 직군의 멤버들이 남긴 필립앤소피 리얼 후기. 좋은 사람들과 함께하는 특별한 경험을 확인해보세요.',
    },
};

export default function ReviewsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
