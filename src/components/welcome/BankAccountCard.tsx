'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, CreditCard } from 'lucide-react';
import { WelcomeConfig } from '@/types/welcome';

interface BankAccountCardProps {
  bankAccount: WelcomeConfig;
}

export default function BankAccountCard({ bankAccount }: BankAccountCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy = `${bankAccount.bankName} ${bankAccount.accountNumber} ${bankAccount.accountHolder}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="w-full bg-gradient-to-b from-black to-gray-900 py-12 md:py-16">
      <div className="max-w-lg mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Section title */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              입금 안내
            </h2>
            <p className="text-gray-400">
              아래 계좌로 입금해주시면 참여가 확정됩니다.
            </p>
          </div>

          {/* Bank account card */}
          <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700/50 shadow-xl">
            {/* Card icon */}
            <div className="absolute top-4 right-4">
              <CreditCard className="w-8 h-8 text-amber-400/50" />
            </div>

            {/* Bank info */}
            <div className="space-y-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">은행</p>
                <p className="text-white text-lg font-medium">{bankAccount.bankName}</p>
              </div>

              <div>
                <p className="text-gray-500 text-sm mb-1">계좌번호</p>
                <p className="text-white text-xl font-mono font-semibold tracking-wide">
                  {bankAccount.accountNumber}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-sm mb-1">예금주</p>
                <p className="text-white text-lg font-medium">{bankAccount.accountHolder}</p>
              </div>

              {bankAccount.amountDescription && (
                <div>
                  <p className="text-gray-500 text-sm mb-1">입금 금액</p>
                  <p className="text-amber-400 text-2xl font-bold">
                    {bankAccount.amountDescription}
                  </p>
                </div>
              )}
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={`
                w-full mt-6 py-3 px-4 rounded-xl font-medium text-base
                flex items-center justify-center gap-2 transition-all duration-200
                ${
                  copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                }
              `}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  복사되었습니다
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  계좌 복사하기
                </>
              )}
            </button>

            {/* Additional note */}
            {bankAccount.note && (
              <p className="text-gray-500 text-sm text-center mt-4">
                {bankAccount.note}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
