'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataContext, setDataContext] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새 메시지 시 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.parentElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // 데이터 새로고침
  const handleRefreshData = async () => {
    if (!user || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/datacntr/ai-chat/refresh', {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });

      if (!response.ok) throw new Error('데이터 로드 실패');

      const data = await response.json();
      setDataContext(data.context);
      setLastUpdated(new Date());
      console.log('✅ 데이터 새로고침 완료');
    } catch (error) {
      console.error('데이터 새로고침 실패:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    const userMessage = input.trim();
    setInput('');

    // 사용자 메시지 추가
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/datacntr/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          dataContext, // 캐시된 데이터 컨텍스트 전달
        }),
      });

      if (!response.ok) {
        throw new Error('AI 응답 실패');
      }

      // 스트리밍 응답 처리
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('응답을 읽을 수 없습니다');

      let assistantMessage = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        console.log('📦 Chunk:', chunk);

        // 단순하게 모든 텍스트 누적 (포맷 무시)
        assistantMessage += chunk;

        // 실시간 업데이트
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1]?.role === 'assistant') {
            newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantMessage };
          }
          return newMessages;
        });
      }

      console.log('✅ 최종 메시지:', assistantMessage);

    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI 데이터 분석
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                {Math.floor((Date.now() - lastUpdated.getTime()) / 60000)}분 전 업데이트
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshData}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  로딩중
                </>
              ) : (
                <>
                  🔄 새로고침
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 채팅 메시지 영역 */}
        <ScrollArea className="h-[400px] pr-4 mb-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="font-semibold mb-2">AI 데이터 분석 어시스턴트</p>
                <p className="text-sm">궁금한 데이터를 물어보세요</p>
                <div className="mt-4 text-xs text-gray-400 space-y-1">
                  <p>예: "1기 참가자 몇 명?"</p>
                  <p>예: "오늘 제출 현황 알려줘"</p>
                  <p>예: "가장 활발한 참가자는?"</p>
                </div>
              </div>
            )}

            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'assistant'
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* 입력 영역 */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="질문을 입력하세요..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
