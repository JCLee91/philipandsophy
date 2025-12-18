'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { WelcomeConfig } from '@/types/welcome';

export default function BankAccountForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<WelcomeConfig>({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    amountDescription: '',
    note: '',
  });

  // 설정 불러오기
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/datacntr/welcome');
      const result = await response.json();
      if (result.success && result.config) {
        setFormData(result.config);
      }
    } catch {
      setMessage({ type: 'error', text: '설정을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // 설정 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/datacntr/welcome', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
      } else {
        setMessage({ type: 'error', text: result.error || '저장에 실패했습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 메시지 */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 은행명 */}
      <div>
        <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
          은행명
        </label>
        <input
          type="text"
          id="bankName"
          name="bankName"
          value={formData.bankName}
          onChange={handleChange}
          placeholder="예: 신한은행"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 계좌번호 */}
      <div>
        <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
          계좌번호
        </label>
        <input
          type="text"
          id="accountNumber"
          name="accountNumber"
          value={formData.accountNumber}
          onChange={handleChange}
          placeholder="예: 110-123-456789"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 예금주 */}
      <div>
        <label htmlFor="accountHolder" className="block text-sm font-medium text-gray-700 mb-1">
          예금주
        </label>
        <input
          type="text"
          id="accountHolder"
          name="accountHolder"
          value={formData.accountHolder}
          onChange={handleChange}
          placeholder="예: 필립앤소피"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 금액 */}
      <div>
        <label htmlFor="amountDescription" className="block text-sm font-medium text-gray-700 mb-1">
          입금 금액
        </label>
        <input
          type="text"
          id="amountDescription"
          name="amountDescription"
          value={formData.amountDescription}
          onChange={handleChange}
          placeholder="예: 10만원"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 추가 안내 */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
          추가 안내 문구 (선택)
        </label>
        <textarea
          id="note"
          name="note"
          value={formData.note || ''}
          onChange={handleChange}
          placeholder="예: 입금 후 1~2일 내 확인 메시지가 발송됩니다."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          저장
        </button>
        <button
          type="button"
          onClick={fetchConfig}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>
    </form>
  );
}
