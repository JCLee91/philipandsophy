'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import UnifiedButton from '@/components/UnifiedButton';
import { Input } from '@/components/ui/input';

interface ChatInputBarProps {
  onSend: (text: string) => Promise<void>;
  isLoading: boolean;
}

export default function ChatInputBar({ onSend, isLoading }: ChatInputBarProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;
    await onSend(message);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 p-3 bg-white border-t z-10 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-2 max-w-screen-md mx-auto">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          className="flex-1 bg-gray-50 border-gray-200 focus-visible:ring-gray-200"
          disabled={isLoading}
        />
        <UnifiedButton
          onClick={handleSubmit}
          disabled={!message.trim() || isLoading}
          size="icon"
          className="bg-primary hover:bg-primary/90 text-white rounded-full w-10 h-10 shrink-0"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </UnifiedButton>
      </div>
    </div>
  );
}

