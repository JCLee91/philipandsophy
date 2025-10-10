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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import UnifiedButton from '@/components/UnifiedButton';
import { useCreateSubmission, useSubmissionsByParticipant } from '@/hooks/use-submissions';
import { uploadReadingImage, getParticipantById, updateParticipantBookInfo } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, AlertCircle } from 'lucide-react';
import { getDailyQuestion } from '@/constants/daily-questions';
import Image from 'next/image';
import BookSearchAutocomplete from '@/components/BookSearchAutocomplete';
import type { NaverBook } from '@/lib/naver-book-api';
import { logger } from '@/lib/logger';
import { SUBMISSION_VALIDATION } from '@/constants/validation';
import { format } from 'date-fns';
import { getTodayString } from '@/lib/date-utils';

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
  const [bookDescription, setBookDescription] = useState('');
  const [review, setReview] = useState('');
  const [dailyAnswer, setDailyAnswer] = useState('');
  const [dailyQuestion, setDailyQuestion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isLoadingBookTitle, setIsLoadingBookTitle] = useState(false);
  const [alreadySubmittedToday, setAlreadySubmittedToday] = useState(false);

  const { toast } = useToast();
  const createSubmission = useCreateSubmission();
  const { data: allSubmissions = [] } = useSubmissionsByParticipant(participantId);

  // 다이얼로그가 열릴 때 참가자의 현재 책 제목 로드 및 새로운 질문 생성
  useEffect(() => {
    if (open) {
      setDailyQuestion(getDailyQuestion());

      // 오늘 이미 제출했는지 확인
      const today = getTodayString();
      const todaySubmission = allSubmissions.find(
        (sub) => sub.submissionDate === today
      );
      setAlreadySubmittedToday(!!todaySubmission);

      if (todaySubmission) {
        toast({
          title: '이미 제출 완료',
          description: '오늘은 이미 독서 인증을 제출하셨습니다. 하루에 1회만 제출 가능합니다.',
          variant: 'destructive',
        });
      }

      // Race condition 방지를 위한 cleanup flag
      let isCancelled = false;

      // 참가자의 현재 책 정보 로드 (제목 + 저자 + 표지)
      const loadCurrentBook = async () => {
        setIsLoadingBookTitle(true);
        try {
          const participant = await getParticipantById(participantId);

          // 컴포넌트가 언마운트되었는지 확인
          if (isCancelled) return;

          if (participant?.currentBookTitle) {
            setBookTitle(participant.currentBookTitle);
            setBookAuthor(participant.currentBookAuthor || '');
            setBookCoverUrl(participant.currentBookCoverUrl || '');
            setIsAutoFilled(true);
          }
        } catch (error) {
          if (isCancelled) return;

          logger.error('Failed to load current book info:', error);
          toast({
            title: '책 정보 로드 실패',
            description: '이전 독서 정보를 불러오지 못했습니다. 새로 검색해주세요.',
            variant: 'destructive',
          });
        } finally {
          if (!isCancelled) {
            setIsLoadingBookTitle(false);
          }
        }
      };

      loadCurrentBook();

      // Cleanup: 컴포넌트 언마운트 시 flag 설정
      return () => {
        isCancelled = true;
      };
    }
  }, [open, participantId]); // allSubmissions 의존성 제거 - effect 내부에서만 사용

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File size validation (5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: '파일 크기 초과',
        description: '5MB 이하의 이미지만 업로드 가능합니다.',
        variant: 'destructive',
      });
      return;
    }

    // File type validation
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: '지원하지 않는 형식',
        description: 'JPEG, PNG, WebP 형식만 가능합니다.',
        variant: 'destructive',
      });
      return;
    }

    setBookImage(file);

    // 이미지 미리보기
    const reader = new FileReader();

    reader.onloadend = () => {
      setBookImagePreview(reader.result as string);
    };

    reader.onerror = () => {
      reader.abort();
      toast({
        title: '이미지 로드 실패',
        description: '이미지를 불러올 수 없습니다.',
        variant: 'destructive',
      });
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setBookImage(null);
    setBookImagePreview('');
  };

  const handleBookTitleChange = (value: string) => {
    // 기존 메타데이터가 있으면 경고
    if (bookAuthor && bookCoverUrl && value !== bookTitle) {
      const confirmed = window.confirm(
        '책 정보를 수정하면 저자와 표지가 초기화됩니다.\n계속하시겠습니까?'
      );
      if (!confirmed) {
        return; // 취소하면 변경 안 함
      }
    }

    setBookTitle(value);
    setIsAutoFilled(false);
    // 사용자가 직접 입력하면 저자, 표지, 소개글 정보 초기화
    setBookAuthor('');
    setBookCoverUrl('');
    setBookDescription('');
  };

  const handleBookSelect = (book: NaverBook) => {
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setBookCoverUrl(book.image);
    setBookDescription(book.description);
    setIsAutoFilled(false);
  };

  const handleClearTitle = () => {
    setBookTitle('');
    setBookAuthor('');
    setBookCoverUrl('');
    setBookDescription('');
    setIsAutoFilled(false);
  };

  const handleSubmit = async () => {
    // Guard against double submission
    if (uploading) return;

    setUploading(true);

    try {
      const trimmedBookTitle = bookTitle.trim();

      // 1. 책 정보 변경 감지 및 DB 업데이트 (제목 + 저자 + 표지)
      await updateParticipantBookInfo(
        participantId,
        trimmedBookTitle,
        bookAuthor?.trim() || undefined,
        bookCoverUrl || undefined
      );

      // 2. 이미지 업로드
      const bookImageUrl = await uploadReadingImage(bookImage, participationCode);

      // 3. 제출 생성 (책 정보 포함)
      await createSubmission.mutateAsync({
        participantId,
        participationCode,
        bookTitle: trimmedBookTitle,
        ...(bookAuthor.trim() && { bookAuthor: bookAuthor.trim() }),
        ...(bookCoverUrl && { bookCoverUrl }),
        ...(bookDescription.trim() && { bookDescription: bookDescription.trim() }),
        bookImageUrl,
        review: review.trim(),
        dailyQuestion,
        dailyAnswer: dailyAnswer.trim(),
        submittedAt: Timestamp.now(),
        status: 'approved', // status 필드는 유지 (DB 스키마 호환성)
      });

      toast({
        title: '독서 인증 완료 ✅',
        description: '오늘의 서재에서 다른 멤버들의 프로필을 확인해보세요!',
      });

      // 폼 초기화 (책 제목은 DB에 저장되어 다음번에 자동 로드됨)
      setBookImage(null);
      setBookImagePreview('');
      setBookTitle('');
      setBookAuthor('');
      setBookCoverUrl('');
      setBookDescription('');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pt-8 pb-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl">독서 인증하기</DialogTitle>
          <DialogDescription>
            오늘 읽은 내용을 기록하고 인증해보세요. 모든 항목은 필수입니다.
          </DialogDescription>
        </DialogHeader>

        {/* 오늘 이미 제출한 경우 경고 표시 */}
        {alreadySubmittedToday && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">오늘은 이미 제출하셨습니다</p>
              <p className="text-sm text-destructive/80 mt-1">
                독서 인증은 하루에 1회만 가능합니다. 내일 다시 시도해주세요.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6 pt-4">
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
                <UnifiedButton
                  type="button"
                  variant="outline"
                  className="w-full h-32 border-dashed"
                  onClick={() => document.getElementById('book-image-input')?.click()}
                  disabled={uploading || alreadySubmittedToday}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      책 사진 업로드하기
                    </span>
                  </div>
                </UnifiedButton>
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
                <UnifiedButton
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </UnifiedButton>
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
            initialBook={
              isAutoFilled && bookTitle
                ? {
                    title: bookTitle,
                    author: bookAuthor || '',
                    publisher: '',
                    isbn: '',
                    pubdate: '',
                    image: bookCoverUrl || '',
                    link: '',
                    description: '',
                    discount: '',
                  }
                : null
            }
          />

          {/* 3. 간단 감상평 (번호 변경: 4 → 3) */}
          <div className="space-y-3">
            <Label htmlFor="review" className="text-base font-semibold">
              3. 간단 감상평 <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              오늘 읽은 내용에 대한 생각이나 느낀 점을 자유롭게 적어주세요. (40자 이상)
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
              4. 오늘의 질문 (40자 이상) <span className="text-destructive">*</span>
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

        <DialogFooter className="gap-3 border-t pt-4">
          <UnifiedButton
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
            size="sm"
          >
            취소
          </UnifiedButton>
          <UnifiedButton
            onClick={handleSubmit}
            disabled={
              alreadySubmittedToday ||
              !bookImage ||
              !bookTitle.trim() ||
              review.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH ||
              dailyAnswer.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH
            }
            loading={uploading}
            loadingText="제출 중..."
            size="sm"
          >
            {alreadySubmittedToday ? '오늘 제출 완료' : '제출하기'}
          </UnifiedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
