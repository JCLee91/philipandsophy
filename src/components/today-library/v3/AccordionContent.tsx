'use client';

import { ChevronDown } from 'lucide-react';

interface AccordionContentProps {
  text: string;
  isExpanded: boolean;
}

export default function AccordionContent({
  text,
  isExpanded,
}: AccordionContentProps) {
  return (
    <div className="flex justify-between items-start gap-2">
      <div
        className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px]' : 'max-h-[1.6em]'
        }`}
      >
        <p className="text-[14px] text-[#333D4B] leading-[1.6] break-all whitespace-pre-wrap">
          {text || '(답변 없음)'}
        </p>
      </div>

      <div className={`shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
        <ChevronDown className="w-5 h-5 text-[#B0B8C1]" />
      </div>
    </div>
  );
}
