'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { WelcomeConfig } from '@/types/welcome';

interface PaymentCardProps {
  bankAccount: WelcomeConfig;
}

export default function PaymentCard({ bankAccount }: PaymentCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy = `${bankAccount.bankName} ${bankAccount.accountNumber} ${bankAccount.accountHolder}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="w-full bg-black py-20 px-4">
      <div className="max-w-[500px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <span className="text-gray-500 font-medium tracking-widest text-xs uppercase mb-3 block">
            Join Us
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            멤버십 등록
          </h2>
          <p className="text-gray-400 font-light">
            아래 계좌로 멤버십 비용을 입금해주시면,<br />
            확인 후 웰컴 메시지를 보내드립니다.
          </p>
        </motion.div>

        {/* Minimalist Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative"
        >
          {/* Benefits Section */}
          <div className="mb-12">
            <h3 className="text-white text-sm font-medium uppercase tracking-wider mb-6 opacity-70">
              Membership Benefits
            </h3>
            <div className="space-y-0">
              {[
                { id: '01', title: '멤버 전용 앱 초대' },
                { id: '02', title: '2주 독서 프로그램' },
                { id: '03', title: '즐거운 웰컴 파티' },
                { id: '04', title: '기존 멤버 재참여 50% 할인권' },
                { id: '05', title: '멤버들과 즐기는 다양한 문화 생활' },
                { id: '06', title: '월간 프라이빗 멤버스 이벤트' },
              ].map((benefit, index) => (
                <motion.div
                  key={benefit.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                    ease: 'easeOut'
                  }}
                  className="flex items-center py-4 border-b border-white/5 group bg-transparent hover:bg-white/[0.02] transition-colors -mx-4 px-4 rounded-lg"
                >
                  <span className="text-gray-600 font-mono text-sm mr-6 group-hover:text-gray-500 transition-colors">
                    {benefit.id}
                  </span>
                  <span className="text-gray-300 font-light text-lg group-hover:text-white transition-colors">
                    {benefit.title}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Payment Section */}
          <div className="bg-zinc-900/30 rounded-2xl p-6 md:p-8 border border-white/5 backdrop-blur-sm">
            {/* Amount */}
            <div className="flex justify-between items-baseline mb-8 pb-8 border-b border-white/5">
              <span className="text-gray-400 font-light">멤버십 비용</span>
              <div className="text-right flex flex-col items-end">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium text-[#62bbff] bg-[#62bbff]/10 px-2 py-0.5 rounded-full tracking-wider uppercase">
                    Special Price
                  </span>
                  <span className="text-gray-600 font-light line-through text-lg">
                    150,000원
                  </span>
                </div>
                <span className="text-3xl font-light text-white tracking-tight block">
                  {bankAccount.amountDescription || '150,000원'}
                </span>
              </div>
            </div>

            {/* Bank Info */}
            <div className="space-y-5">
              <div className="flex justify-between items-center text-sm md:text-base">
                <span className="text-gray-500">은행</span>
                <span className="text-gray-200 font-light">{bankAccount.bankName}</span>
              </div>
              <div className="flex justify-between items-center text-sm md:text-base">
                <span className="text-gray-500">예금주</span>
                <span className="text-gray-200 font-light">{bankAccount.accountHolder}</span>
              </div>
              <div className="flex justify-between items-center text-sm md:text-base pt-2">
                <span className="text-gray-500">계좌번호</span>
                <button
                  onClick={handleCopy}
                  className="group flex items-center gap-3 text-white hover:text-[#62bbff] transition-colors text-left"
                >
                  <span className="font-mono text-lg tracking-wide">{bankAccount.accountNumber}</span>
                  <div className="p-1.5 rounded-full bg-white/5 group-hover:bg-[#62bbff]/10 transition-colors">
                    {copied ? (
                      <Check className="w-4 h-4 text-[#62bbff]" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500 group-hover:text-[#62bbff]" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {bankAccount.note && (
              <p className="text-xs text-center text-gray-600 mt-8 pt-6 border-t border-white/5 leading-relaxed">
                {bankAccount.note}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </section >
  );
}
