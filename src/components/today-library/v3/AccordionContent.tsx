'use client';

import { ChevronDown } from 'lucide-react';
import { normalizeTextForPreview } from '@/lib/text-utils';

interface AccordionContentProps {
  text: string;
  isExpanded: boolean;
}

export default function AccordionContent({
  text,
  isExpanded,
}: AccordionContentProps) {
  const previewText = text ? normalizeTextForPreview(text) : '(답변 없음)';

  return (
    <div className="flex justify-between items-start gap-2">
      <div className="flex-1 min-w-0">
        {isExpanded ? (
          <p className="text-[14px] text-[#333D4B] leading-[1.6] whitespace-pre-wrap wrap-break-word">
            {text || '(답변 없음)'}
          </p>
        ) : (
          <p className="text-[14px] text-[#333D4B] leading-[1.6] truncate max-w-[320px]">
            {previewText}
          </p>
        )}
      </div>

      <div className={`shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
        <ChevronDown className="w-5 h-5 text-[#B0B8C1]" />
      </div>
    </div>
  );
}
