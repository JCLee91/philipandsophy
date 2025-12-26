'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { WelcomeConfig } from '@/types/welcome';

interface PaymentCardProps {
  bankAccount: WelcomeConfig;
  discountExpiresAt?: string; // 특별 할인 만료 시간 (ISO string)
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(expiresAt: string): TimeRemaining {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
}

export default function PaymentCard({ bankAccount, discountExpiresAt }: PaymentCardProps) {
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);

  // 카운트다운 타이머
  useEffect(() => {
    if (!discountExpiresAt) return;

    // 초기 값 설정
    setTimeRemaining(calculateTimeRemaining(discountExpiresAt));

    // 1초마다 업데이트
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(discountExpiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [discountExpiresAt]);

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
            {/* Countdown Timer - Inside Card */}
            {timeRemaining && !timeRemaining.isExpired && (
              <div className="mb-6 -mx-6 md:-mx-8 -mt-6 md:-mt-8 px-6 md:px-8 pt-5 pb-5 bg-gradient-to-r from-[#62bbff]/5 via-[#62bbff]/10 to-[#62bbff]/5 border-b border-[#62bbff]/10 rounded-t-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#62bbff] animate-pulse shadow-[0_0_8px_rgba(98,187,255,0.6)]" />
                  <span className="text-[#62bbff]/80 text-xs font-medium tracking-wide uppercase">
                    Limited Time Offer
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {timeRemaining.days > 0 && (
                    <div className="text-center">
                      <span className="text-3xl md:text-4xl font-light text-white drop-shadow-[0_0_10px_rgba(98,187,255,0.3)]">
                        {timeRemaining.days}
                      </span>
                      <span className="text-gray-500 text-xs block mt-1">일</span>
                    </div>
                  )}
                  {timeRemaining.days > 0 && (
                    <span className="text-gray-600 text-2xl font-light mb-4">:</span>
                  )}
                  <div className="text-center">
                    <span className="text-3xl md:text-4xl font-light text-white drop-shadow-[0_0_10px_rgba(98,187,255,0.3)]">
                      {String(timeRemaining.hours).padStart(2, '0')}
                    </span>
                    <span className="text-gray-500 text-xs block mt-1">시간</span>
                  </div>
                  <span className="text-gray-600 text-2xl font-light mb-4">:</span>
                  <div className="text-center">
                    <span className="text-3xl md:text-4xl font-light text-white drop-shadow-[0_0_10px_rgba(98,187,255,0.3)]">
                      {String(timeRemaining.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-gray-500 text-xs block mt-1">분</span>
                  </div>
                  <span className="text-gray-600 text-2xl font-light mb-4">:</span>
                  <div className="text-center">
                    <span className="text-3xl md:text-4xl font-light text-white drop-shadow-[0_0_10px_rgba(98,187,255,0.3)]">
                      {String(timeRemaining.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-gray-500 text-xs block mt-1">초</span>
                  </div>
                </div>
                <p className="text-center text-gray-500 text-[11px] mt-3">
                  이후 정가 150,000원이 적용됩니다
                </p>
              </div>
            )}

            {/* Expired Notice - Inside Card */}
            {timeRemaining && timeRemaining.isExpired && (
              <div className="mb-6 pb-6 border-b border-white/5">
                <p className="text-gray-500 text-sm font-light text-center">
                  특별 할인 기간이 종료되었습니다
                </p>
              </div>
            )}

            {/* Amount */}
            <div className="flex justify-between items-start mb-8 pb-8 border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-gray-400 font-light text-lg mb-2">멤버십 비용</span>

                {/* Value Add Description */}
                <div className="flex flex-col gap-1.5 animation-fade-in">
                  <span className="text-xs text-blue-400/80 font-medium tracking-tighter">
                    ALL INCLUSIVE
                  </span>
                  <ul className="flex flex-col gap-1">
                    {[
                      '2주 온라인 독서 프로그램',
                      '웰컴 파티 (와인 & 핑거푸드)',
                      '멤버십 전용 커뮤니티 초대'
                    ].map((item, i) => (
                      <li key={i} className="text-[11px] text-gray-300 font-light flex items-center gap-1.5">
                        <div className="w-0.5 h-0.5 rounded-full bg-gray-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                {/* Show discount badge only when discount is active */}
                {(!timeRemaining || !timeRemaining.isExpired) && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium text-[#62bbff] bg-[#62bbff]/10 px-2 py-0.5 rounded-full tracking-wider uppercase">
                      Special Price
                    </span>
                    <span className="text-gray-600 font-light line-through text-lg">
                      15만원
                    </span>
                  </div>
                )}
                <span className="text-3xl font-light text-white tracking-tight block">
                  {timeRemaining?.isExpired
                    ? '15만원'
                    : (bankAccount.amountDescription || '15만원')}
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
