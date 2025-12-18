'use client';

import BankAccountForm from './_components/BankAccountForm';

export default function WelcomePageAdmin() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">환영 페이지 관리</h1>
        <p className="text-gray-600 mt-2">
          합격자 환영 페이지에 표시될 계좌 정보를 관리합니다.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">계좌 정보 설정</h2>
        <BankAccountForm />
      </div>

      {/* 사용 안내 */}
      <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">API 사용 안내</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>토큰 생성 API:</strong>{' '}
            <code className="bg-blue-100 px-2 py-0.5 rounded">POST /api/welcome/token</code>
          </p>
          <p className="text-blue-700 ml-4">
            Body: {`{ "phoneNumber": "010-1234-5678", "secretKey": "YOUR_SECRET" }`}
          </p>
          <p className="mt-3">
            <strong>환경변수:</strong>{' '}
            <code className="bg-blue-100 px-2 py-0.5 rounded">WELCOME_API_SECRET</code> 설정 필요
          </p>
        </div>
      </div>
    </div>
  );
}
