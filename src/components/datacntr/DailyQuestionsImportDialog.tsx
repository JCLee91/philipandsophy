import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UnifiedButton } from '@/components/common';
import { Textarea } from '@/components/ui/textarea';
import { Clipboard, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImportedQuestion {
  category: string;
  question: string;
}

interface DailyQuestionsImportDialogProps {
  onImport: (questions: ImportedQuestion[]) => void;
}

export default function DailyQuestionsImportDialog({ onImport }: DailyQuestionsImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const { toast } = useToast();

  const handleParse = () => {
    if (!text.trim()) {
      toast({
        title: '내용 없음',
        description: '붙여넣은 내용이 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    const lines = text.trim().split('\n');
    const parsedQuestions: ImportedQuestion[] = [];

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const parts = trimmedLine.split('\t').map((s) => s.trim());
      
      let category = '';
      let question = '';

      // Format: Category | Status | Question (3 parts)
      // Or: Category | Question (2 parts)
      if (parts.length >= 3) {
        category = parts[0];
        question = parts[2];
      } else if (parts.length === 2) {
        category = parts[0];
        question = parts[1];
      }

      if (category && question) {
        parsedQuestions.push({ category, question });
      }
    });

    if (parsedQuestions.length === 0) {
      toast({
        title: '파싱 실패',
        description: '올바른 형식이 아닙니다. (탭으로 구분된 텍스트)',
        variant: 'destructive',
      });
      return;
    }

    onImport(parsedQuestions);
    setIsOpen(false);
    setText('');
    
    toast({
      title: '가져오기 완료',
      description: `${parsedQuestions.length}개의 질문을 가져왔습니다.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <UnifiedButton variant="outline" size="sm" icon={<Clipboard className="h-4 w-4" />}>
          엑셀 붙여넣기
        </UnifiedButton>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>엑셀 데이터 붙여넣기</DialogTitle>
          <DialogDescription>
            엑셀에서 복사한 데이터를 아래 텍스트 영역에 붙여넣으세요.<br />
            형식: <code>카테고리 [탭] (상태) [탭] 질문내용</code>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder={`예시:\n성향\t채택3\t새로운 집으로 이사를 간다면...\n가치관 & 삶\t채택3\t당신의 부모님으로부터...`}
            className="h-[300px] font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <DialogFooter>
          <UnifiedButton variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            취소
          </UnifiedButton>
          <UnifiedButton size="sm" onClick={handleParse} icon={<Upload className="h-4 w-4" />}>
            적용하기
          </UnifiedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

