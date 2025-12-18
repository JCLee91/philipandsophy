import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '2주 독서 프로그램 | 필립앤소피',
    description: '하루 10분 독서로 완성하는 나만의 프로필 북. 2주 동안 책을 읽고 생각을 나누며, AI가 매칭해주는 비슷한 결의 사람들과 웰컴 파티에서 만나보세요.',
    openGraph: {
        title: '2주 독서 프로그램 | 필립앤소피',
        description: '하루 10분 독서로 완성하는 나만의 프로필 북. 2주 동안 책을 읽고 생각을 나누며, AI가 매칭해주는 비슷한 결의 사람들과 웰컴 파티에서 만나보세요.',
    },
};

export default function ReadingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
