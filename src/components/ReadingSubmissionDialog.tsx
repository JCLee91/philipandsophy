'use client';

import { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateSubmission } from '@/hooks/use-submissions';
import { uploadReadingImage, getParticipantById, updateParticipantBookTitle } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import { getDailyQuestion } from '@/constants/daily-questions';
import Image from 'next/image';
import BookSearchAutocomplete from '@/components/BookSearchAutocomplete';
import type { NaverBook } from '@/lib/naver-book-api';
import { logger } from '@/lib/logger';
import { SUBMISSION_VALIDATION } from '@/constants/validation';

interface ReadingSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string;
  participationCode: string;
}

export default function ReadingSubmissionDialog({
  open,
  onOpenChange,
  participantId,
  participationCode,
}: ReadingSubmissionDialogProps) {

  const [bookImage, setBookImage] = useState<File | null>(null);
  const [bookImagePreview, setBookImagePreview] = useState<string>('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCoverUrl, setBookCoverUrl] = useState('');
  const [review, setReview] = useState('');
  const [dailyAnswer, setDailyAnswer] = useState('');
  const [dailyQuestion, setDailyQuestion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isLoadingBookTitle, setIsLoadingBookTitle] = useState(false);

  const { toast } = useToast();
  const createSubmission = useCreateSubmission();

  // 다이얼로그가 열릴 때 참가자의 현재 책 제목 로드 및 새로운 질문 생성
  useEffect(() => {
    if (open) {
      setDailyQuestion(getDailyQuestion());

      // 참가자의 현재 책 제목 로드
      const loadCurrentBook = async () => {
        setIsLoadingBookTitle(true);
        try {
          const participant = await getParticipantById(participantId);
          if (participant?.currentBookTitle) {
            setBookTitle(participant.currentBookTitle);
            setIsAutoFilled(true);
          }
        } catch (error) {
          logger.error('Failed to load current book title:', error);
        } finally {
          setIsLoadingBookTitle(false);
        }
      };

      loadCurrentBook();
    }
  }, [open, participantId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBookImage(file);
      // 이미지 미리보기
      const reader = new FileReader();
      reader.onloadend = () => {
        setBookImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setBookImage(null);
    setBookImagePreview('');
  };

  const handleBookTitleChange = (value: string) => {
    setBookTitle(value);
    setIsAutoFilled(false);
    // 사용자가 직접 입력하면 저자와 표지 정보 초기화
    setBookAuthor('');
    setBookCoverUrl('');
  };

  const handleBookSelect = (book: NaverBook) => {
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setBookCoverUrl(book.image);
    setIsAutoFilled(false);
  };

  const handleClearTitle = () => {
    setBookTitle('');
    setBookAuthor('');
    setBookCoverUrl('');
    setIsAutoFilled(false);
  };

  const handleSubmit = async () => {
    setUploading(true);

    try {
      const trimmedBookTitle = bookTitle.trim();

      // 1. 책 제목 변경 감지 및 DB 업데이트
      await updateParticipantBookTitle(participantId, trimmedBookTitle);

      // 2. 이미지 업로드
      const bookImageUrl = await uploadReadingImage(bookImage, participationCode);

      // 3. 제출 생성 (책 정보 포함)
      await createSubmission.mutateAsync({
        participantId,
        participationCode,
        bookTitle: trimmedBookTitle,
        bookAuthor: bookAuthor.trim() || undefined,
        bookCoverUrl: bookCoverUrl || undefined,
        bookImageUrl,
        review: review.trim(),
        dailyQuestion,
        dailyAnswer: dailyAnswer.trim(),
        submittedAt: Timestamp.now(),
        status: 'pending',
      });

      toast({
        title: '제출 완료',
        description: '독서 인증이 성공적으로 제출되었습니다.',
      });

      // 폼 초기화 (책 제목은 DB에 저장되어 다음번에 자동 로드됨)
      setBookImage(null);
      setBookImagePreview('');
      setBookTitle('');
      setBookAuthor('');
      setBookCoverUrl('');
      setReview('');
      setDailyAnswer('');
      setIsAutoFilled(false);
      onOpenChange(false);
    } catch (error) {
      logger.error('Submission error:', error);
      toast({
        title: '제출 실패',
        description: '독서 인증 제출 중 오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">독서 인증하기</DialogTitle>
          <DialogDescription>
            오늘 읽은 내용을 기록하고 인증해보세요. 모든 항목은 필수입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 1. 책 사진 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              1. 책 사진 <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              오늘 읽은 책의 사진을 첨부해주세요.
            </p>

            {!bookImagePreview ? (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-32 border-dashed"
                  onClick={() => document.getElementById('book-image-input')?.click()}
                  disabled={uploading}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      책 사진 업로드하기
                    </span>
                  </div>
                </Button>
                <input
                  id="book-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={uploading}
                />
              </div>
            ) : (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                <Image
                  src={bookImagePreview}
                  alt="책 사진"
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  priority
                  className="object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* 2. 책 제목 (자동완성 컴포넌트로 교체) */}
          <BookSearchAutocomplete
            value={bookTitle}
            onChange={handleBookTitleChange}
            onBookSelect={handleBookSelect}
            disabled={uploading || isLoadingBookTitle}
            isAutoFilled={isAutoFilled}
            onClear={handleClearTitle}
          />

          {/* 3. 간단 감상평 (번호 변경: 4 → 3) */}
          <div className="space-y-3">
            <Label htmlFor="review" className="text-base font-semibold">
              3. 간단 감상평 <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              오늘 읽은 내용에 대한 생각이나 느낀 점을 자유롭게 적어주세요.
            </p>
            <Textarea
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="예: 오늘은 주인공이 중요한 결정을 내리는 장면을 읽었어요. 용기 있는 선택이 인상 깊었습니다..."
              className="min-h-[120px] resize-none"
              disabled={uploading}
            />
            <div className={`text-xs text-right ${review.length >= SUBMISSION_VALIDATION.MIN_TEXT_LENGTH ? 'text-muted-foreground' : 'text-destructive'}`}>
              {review.length}/{SUBMISSION_VALIDATION.MIN_TEXT_LENGTH}
            </div>
          </div>

          {/* 4. 오늘의 질문 (번호 변경: 5 → 4) */}
          <div className="space-y-3">
            <Label htmlFor="dailyAnswer" className="text-base font-semibold">
              4. 오늘의 질문 <span className="text-destructive">*</span>
            </Label>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <p className="text-sm font-medium text-primary">{dailyQuestion}</p>
            </div>
            <Textarea
              id="dailyAnswer"
              value={dailyAnswer}
              onChange={(e) => setDailyAnswer(e.target.value)}
              placeholder="질문에 대한 답변을 자유롭게 작성해주세요..."
              className="min-h-[100px] resize-none"
              disabled={uploading}
            />
            <div className={`text-xs text-right ${dailyAnswer.length >= SUBMISSION_VALIDATION.MIN_TEXT_LENGTH ? 'text-muted-foreground' : 'text-destructive'}`}>
              {dailyAnswer.length}/{SUBMISSION_VALIDATION.MIN_TEXT_LENGTH}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              uploading ||
              !bookImage ||
              !bookTitle.trim() ||
              review.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH ||
              dailyAnswer.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH
            }
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                제출 중...
              </>
            ) : (
              '제출하기'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
