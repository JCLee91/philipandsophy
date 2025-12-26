'use client';

import PaymentCard from '@/components/welcome/PaymentCard';
import '@/styles/landing.css';

/**
 * 카운트다운 타이머 미리보기 페이지
 * /welcome/preview 에서 확인 가능
 */
export default function WelcomePreviewPage() {
    // 테스트용 데이터: 현재 시간으로부터 3일 후 만료
    const now = new Date();
    const discountExpiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    // 테스트용 계좌 정보
    const mockBankAccount = {
        bankName: '신한은행',
        accountNumber: '110-123-456789',
        accountHolder: '필립앤소피',
        amountDescription: '12만원',
        note: '입금 후 카카오톡으로 알려주시면 빠르게 확인해드립니다.',
    };

    return (
        <main className="landing-page min-h-screen bg-black text-white">
            {/* Preview Info Banner */}
            <div className="bg-blue-600 text-center py-3 px-4">
                <p className="text-sm">
                    🔍 <strong>미리보기 모드</strong> — 카운트다운 타이머가 3일 후 만료로 설정됨
                </p>
            </div>

            {/* 카운트다운 타이머 확인용 */}
            <PaymentCard
                bankAccount={mockBankAccount}
                discountExpiresAt={discountExpiresAt}
            />

            {/* 만료된 상태 테스트용 */}
            <div className="max-w-[500px] mx-auto px-4 py-8">
                <h3 className="text-gray-400 text-sm mb-4 text-center">
                    ⬇️ 만료된 상태 미리보기 ⬇️
                </h3>
            </div>
            <PaymentCard
                bankAccount={mockBankAccount}
                discountExpiresAt={new Date('2020-01-01').toISOString()} // 과거 날짜 = 만료됨
            />
        </main>
    );
}
