'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useCreateSubmission, useUpdateSubmission, useSubmissionsByParticipant } from '@/hooks/use-submissions';
import { uploadReadingImage, getParticipantById, updateParticipantBookInfo } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, AlertCircle } from 'lucide-react';
import { getDailyQuestion } from '@/lib/firebase/daily-questions';
import type { DailyQuestion as DailyQuestionType } from '@/types/database';
import Image from 'next/image';
import BookSearchAutocomplete from '@/components/BookSearchAutocomplete';
import type { NaverBook } from '@/lib/naver-book-api';
import { logger } from '@/lib/logger';
import { SUBMISSION_VALIDATION, IMAGE_OPTIMIZATION } from '@/constants/validation';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { getTodayString, getSubmissionDate } from '@/lib/date-utils';
import { validateImageFile, compressImageIfNeeded } from '@/lib/image-validation';
import type { ReadingSubmission } from '@/types/database';
import { useModalCleanup } from '@/hooks/use-modal-cleanup';

interface ReadingSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string;
  participationCode: string;
  cohortId: string; // 🆕 기수 ID
  existingSubmission?: ReadingSubmission; // 수정 모드: 기존 제출물
}

/**
 * 보상 대상 여부 확인 (완전 투명하게 처리)
 * 10/28 00:00-01:59에 제출한 사용자가 10/28 오늘 다시 접속한 경우
 *
 * @param submissions - 사용자의 모든 제출 기록
 * @returns 보상 필요 여부
 */
function checkNeedsCompensation(submissions: ReadingSubmission[]): boolean {
  // 현재 날짜가 2025-10-28인지 확인 (오늘)
  const today = getTodayString();
  if (today !== '2025-10-28') {
    return false;
  }

  // 10/27 날짜로 저장된 제출물 찾기
  // (새벽 2시 정책에 의해 10/28 00:00-01:59 제출이 10/27로 저장됨)
  const oct27Submission = submissions.find(sub => sub.submissionDate === '2025-10-27');
  if (!oct27Submission || !oct27Submission.submittedAt) {
    return false;
  }

  // submittedAt 타임스탬프를 한국 시간으로 변환
  const submittedAtDate = oct27Submission.submittedAt.toDate();
  const submittedAtKST = toZonedTime(submittedAtDate, 'Asia/Seoul');
  const hour = submittedAtKST.getHours();
  const day = submittedAtKST.getDate();

  // 10/28 00:00-01:59에 제출했으면 보상 대상
  // (실제 제출 시각이 28일 새벽이어야 함)
  return day === 28 && hour >= 0 && hour < 2;
}

export default function ReadingSubmissionDialog({
  open,
  onOpenChange,
  participantId,
  participationCode,
  cohortId,
  existingSubmission,
}: ReadingSubmissionDialogProps) {
  useModalCleanup(open);

  // iOS PWA에서 다이얼로그 닫을 때 강제 리렌더링
  const handleDialogChange = (newOpen: boolean) => {
    onOpenChange(newOpen);

    // iOS PWA에서 다이얼로그 닫을 때 렌더링 버그 수정
    if (!newOpen && window.matchMedia('(display-mode: standalone)').matches) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        setTimeout(() => {
          // 1. 스크롤 위치 미세 조정으로 리렌더링 유도
          window.scrollBy(0, 1);
          window.scrollBy(0, -1);

          // 2. body 강제 리플로우
          document.body.style.display = 'none';
          void document.body.offsetHeight; // 리플로우 트리거
          document.body.style.display = '';

          // 3. viewport 재계산 이벤트 발생
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }
    }
  };

  const isEditMode = !!existingSubmission;

  const [bookImage, setBookImage] = useState<File | null>(null);
  const [bookImagePreview, setBookImagePreview] = useState<string>('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCoverUrl, setBookCoverUrl] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [review, setReview] = useState('');
  const [dailyAnswer, setDailyAnswer] = useState('');
  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestionType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isLoadingBookTitle, setIsLoadingBookTitle] = useState(false);
  const [alreadySubmittedToday, setAlreadySubmittedToday] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>(''); // 업로드 진행 단계

  const { toast } = useToast();
  const createSubmission = useCreateSubmission();
  const updateSubmission = useUpdateSubmission();
  const { data: allSubmissions = [] } = useSubmissionsByParticipant(participantId);

  // 다이얼로그가 열릴 때 데이터 로드
  const userModifiedBookRef = useRef(false);
  const previousOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !previousOpenRef.current;
    previousOpenRef.current = open;
    let isMounted = true; // Race condition 방지

    if (open) {
      if (justOpened) {
        userModifiedBookRef.current = false;
      }
      // 수정 모드: 기존 데이터 pre-fill
      if (isEditMode && existingSubmission) {
        setBookTitle(existingSubmission.bookTitle || '');
        setBookAuthor(existingSubmission.bookAuthor || '');
        setBookCoverUrl(existingSubmission.bookCoverUrl || '');
        setBookDescription(existingSubmission.bookDescription || '');
        setReview(existingSubmission.review || '');
        setDailyAnswer(existingSubmission.dailyAnswer || '');
        setBookImagePreview(existingSubmission.bookImageUrl || '');
        setIsAutoFilled(true);

        // 기존 질문 로드
        if (existingSubmission.dailyQuestion) {
          setDailyQuestion({
            id: '0',
            dayNumber: 0,
            date: '',
            question: existingSubmission.dailyQuestion,
            category: '가치관 & 삶', // 기본 카테고리
            order: 0,
            createdAt: null as any,
            updatedAt: null as any,
          });
        }

        setAlreadySubmittedToday(false); // 수정 모드에서는 경고 표시 안 함
        return; // 수정 모드에서는 추가 로드 불필요
      }

      // 신규 제출 모드: 오늘의 질문 동적 로딩
      const loadDailyQuestion = async () => {
        // 새벽 2시 정책 적용: 제출 날짜 기준으로 질문 가져오기
        const submissionDate = getSubmissionDate();

        // 보상 로직: 10/28 00:00-01:59 제출자가 10/28(오늘) 다시 인증하는 경우
        // 10/27 질문을 보여줘야 함 (누락된 질문, 자연스럽게 UI 표시 없이)
        const needsCompensation = checkNeedsCompensation(allSubmissions);

        let questionDate = submissionDate;
        if (needsCompensation) {
          // 10/28 오늘 10/27 질문을 보여줌 (어제 놓친 질문)
          questionDate = '2025-10-27';
        }

        const question = await getDailyQuestion(cohortId, questionDate);
        if (question && isMounted) {
          setDailyQuestion(question);
        }

        // 오늘 이미 제출했는지 확인 (새벽 2시 마감 정책 적용)
        const todaySubmission = allSubmissions.find(
          (sub) => sub.submissionDate === submissionDate
        );
        if (isMounted) {
          setAlreadySubmittedToday(!!todaySubmission);
        }
      };

      loadDailyQuestion();

      // 참가자의 현재 책 정보 로드
      const loadCurrentBook = async () => {
        if (isMounted) {
          setIsLoadingBookTitle(true);
        }
        try {
          const participant = await getParticipantById(participantId);

          if (!userModifiedBookRef.current && participant?.currentBookTitle && isMounted) {
            setBookTitle(participant.currentBookTitle);
            setBookAuthor(participant.currentBookAuthor || '');
            setBookCoverUrl(participant.currentBookCoverUrl || '');
            setIsAutoFilled(true);
          }
        } catch (error) {
          logger.error('Failed to load current book info:', error);
          if (isMounted) {
            toast({
              title: '책 정보 로드 실패',
              description: '이전 독서 정보를 불러오지 못했습니다. 새로 검색해주세요.',
              variant: 'destructive',
            });
          }
        } finally {
          if (isMounted) {
            setIsLoadingBookTitle(false);
          }
        }
      };

      loadCurrentBook();
    }

    return () => {
      isMounted = false; // Cleanup
    };
  }, [open, participantId, cohortId, allSubmissions, isEditMode, existingSubmission, toast]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. 파일 유효성 검증 (50MB 기준)
    const validation = validateImageFile(file, SUBMISSION_VALIDATION.MAX_IMAGE_SIZE / (1024 * 1024));
    if (!validation.valid) {
      toast({
        title: '파일 검증 실패',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    try {
      // 10MB 이상이면 자동 압축
      const processedFile = await compressImageIfNeeded(file);
      setBookImage(processedFile);

      // 압축 로그 (10MB 이상일 때만)
      if (file.size >= 10 * 1024 * 1024) {
        logger.info('이미지 압축 완료', {
          original: (file.size / 1024 / 1024).toFixed(1) + 'MB',
          compressed: (processedFile.size / 1024 / 1024).toFixed(1) + 'MB',
        });
      }

      // 이미지 미리보기
      const reader = new FileReader();

      reader.onloadend = () => {
        setBookImagePreview(reader.result as string);
      };

      reader.onerror = () => {
        toast({
          title: '이미지 로드 실패',
          description: '이미지를 불러올 수 없습니다.',
          variant: 'destructive',
        });
      };

      reader.readAsDataURL(processedFile);
    } catch (error) {
      logger.error('Image processing error:', error);
      toast({
        title: '이미지 처리 실패',
        description: error instanceof Error ? error.message : '이미지를 처리할 수 없습니다. 다른 이미지를 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveImage = () => {
    setBookImage(null);
    setBookImagePreview('');
  };

  const handleBookTitleChange = (value: string) => {
    // 빈 값으로 변경하는 경우는 X 버튼(handleClearTitle)에서 처리하므로 여기서는 확인 안 함
    if (value === '') {
      setBookTitle(value);
      return;
    }
    
    // 기존 메타데이터가 있으면 경고 (수정하는 경우만)
    if (bookAuthor && bookCoverUrl && value !== bookTitle) {
      const confirmed = window.confirm(
        '책 정보를 수정하면 저자와 표지가 초기화됩니다.\n계속하시겠습니까?'
      );
      if (!confirmed) {
        return; // 취소하면 변경 안 함
      }
    }
    userModifiedBookRef.current = true;
    setBookTitle(value);
    setIsAutoFilled(false);
    // 사용자가 직접 입력하면 저자, 표지, 소개글 정보 초기화
    setBookAuthor('');
    setBookCoverUrl('');
    setBookDescription('');
  };

  const handleBookSelect = (book: NaverBook) => {
    userModifiedBookRef.current = true;
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setBookCoverUrl(book.image);
    setBookDescription(book.description);
    setIsAutoFilled(false);
  };

  const handleClearTitle = (): boolean => {
    // 기존 메타데이터가 있으면 경고
    if (bookAuthor || bookCoverUrl) {
      const confirmed = window.confirm(
        '책 정보를 수정하면 저자와 표지가 초기화됩니다.\n계속하시겠습니까?'
      );
      if (!confirmed) {
        return false; // 취소하면 false 반환
      }
    }
    
    userModifiedBookRef.current = true;
    setBookTitle('');
    setBookAuthor('');
    setBookCoverUrl('');
    setBookDescription('');
    setIsAutoFilled(false);
    return true; // 성공하면 true 반환
  };

  const handleSubmit = async () => {
    setUploading(true);

    try {
      // ========== 수정 모드 ==========
      if (isEditMode && existingSubmission) {
        setUploadStep('수정 중...'); 

        await updateSubmission.mutateAsync({
          id: existingSubmission.id,
          data: {
            review: review.trim(),
            dailyAnswer: dailyAnswer.trim(),
          },
        });

        toast({
          title: '독서 인증 수정 완료 ✅',
          description: '수정 내용이 저장되었습니다.',
        });

        onOpenChange(false);
        return;
      }

      // ========== 신규 제출 모드 ==========

      const trimmedBookTitle = bookTitle.trim();

      // 검증
      if (!bookImage) {
        throw new Error('책 사진을 선택해주세요');
      }

      if (!trimmedBookTitle) {
        throw new Error('책 제목을 입력하거나 검색해 주세요');
      }

      // 1️⃣ 책 정보 업데이트 (빠름, 실패 시 조기 종료)
      setUploadStep('책 정보 저장 중...');

      await updateParticipantBookInfo(
        participantId,
        trimmedBookTitle,
        bookAuthor?.trim() || undefined,
        bookCoverUrl || undefined
      );

      // 2️⃣ 이미지 업로드 (느림, 하지만 DB는 이미 저장 완료)
      setUploadStep('이미지 업로드 중...');

      let bookImageUrl: string;
      try {
        bookImageUrl = await uploadReadingImage(bookImage, participationCode);
      } catch (uploadError) {
        // Firebase Storage specific error handling
        if (uploadError instanceof Error) {
          if (uploadError.message.includes('storage/quota-exceeded')) {
            throw new Error('스토리지 용량이 초과되었습니다. 관리자에게 문의하세요.');
          }
          if (uploadError.message.includes('storage/unauthorized')) {
            throw new Error('업로드 권한이 없습니다. 다시 시도해주세요.');
          }
          if (uploadError.message.includes('storage/canceled')) {
            throw new Error('업로드가 취소되었습니다.');
          }
        }
        throw uploadError; // Re-throw for generic handler
      }

      // 3️⃣ 제출 생성 (빠름)
      setUploadStep('제출물 저장 중...');

      await createSubmission.mutateAsync({
          participantId,
          participationCode,
          bookTitle: trimmedBookTitle,
          ...(bookAuthor.trim() && { bookAuthor: bookAuthor.trim() }),
          ...(bookCoverUrl && { bookCoverUrl }),
          ...(bookDescription.trim() && { bookDescription: bookDescription.trim() }),
          bookImageUrl,
          review: review.trim(),
          dailyQuestion: dailyQuestion?.question || '',
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

      // 사용자 친화적인 에러 메시지
      const errorMessage = error instanceof Error
        ? error.message
        : '독서 인증 제출 중 오류가 발생했습니다. 다시 시도해주세요.';

      toast({
        title: '제출 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadStep(''); // 진행 상태 초기화
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl h-full sm:h-[90vh] flex flex-col gap-0 reading-dialog-ios-safe">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl">
            {isEditMode ? '독서 인증 수정하기' : '독서 인증하기'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? '리뷰와 답변을 수정할 수 있습니다. 책 정보와 이미지는 수정할 수 없습니다.'
              : '오늘 읽은 내용을 기록하고 인증해보세요. 모든 항목은 필수입니다.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">

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
              {isEditMode ? '책 사진은 수정할 수 없습니다.' : '오늘 읽은 책의 사진을 첨부해주세요.'}
            </p>

            {!bookImagePreview ? (
              <div className="flex flex-col gap-2">
                <UnifiedButton
                  type="button"
                  variant="outline"
                  className="w-full h-32 border-dashed"
                  onClick={() => document.getElementById('book-image-input')?.click()}
                  disabled={uploading || alreadySubmittedToday || isEditMode}
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
                  disabled={uploading || isEditMode}
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
                {!isEditMode && (
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
                )}
              </div>
            )}
          </div>

          {/* 2. 책 제목 (자동완성 컴포넌트로 교체) */}
          <BookSearchAutocomplete
            value={bookTitle}
            onChange={handleBookTitleChange}
            onBookSelect={handleBookSelect}
            disabled={uploading || isLoadingBookTitle || isEditMode}
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
              {dailyQuestion && (
                <div className="space-y-1">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary mb-2">
                    {dailyQuestion.category}
                  </span>
                  <p className="text-sm font-medium text-primary">{dailyQuestion.question}</p>
                </div>
              )}
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
        </div>

        <DialogFooter className="gap-3 border-t pt-4 px-6 pb-6 flex-shrink-0">
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
              isEditMode ? (
                // 수정 모드: 리뷰와 답변만 검증
                review.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH ||
                dailyAnswer.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH
              ) : (
                // 신규 제출 모드: 모든 필드 검증
                alreadySubmittedToday ||
                !bookImage ||
                !bookTitle.trim() ||
                review.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH ||
                dailyAnswer.trim().length < SUBMISSION_VALIDATION.MIN_TEXT_LENGTH
              )
            }
            loading={uploading}
            loadingText={uploadStep || (isEditMode ? '수정 중...' : '제출 중...')}
            size="sm"
          >
            {isEditMode ? '수정하기' : (alreadySubmittedToday ? '오늘 제출 완료' : '제출하기')}
          </UnifiedButton>
        </DialogFooter>
      </DialogContent>

      {/* Safe Area CSS for iOS PWA - PWA Standalone 모드에서만 적용 */}
      <style jsx global>{`
        /* PWA Standalone 모드에서만 iOS Safe Area 적용 */
        @media (max-width: 640px) and (display-mode: standalone) {
          .reading-dialog-ios-safe {
            /* CSS Custom Properties로 중복 계산 방지 */
            --safe-top: env(safe-area-inset-top, 0px);
            --safe-bottom: env(safe-area-inset-bottom, 0px);
            --dialog-height: calc(100vh - var(--safe-top) - var(--safe-bottom));

            /* iOS Safe Area 대응 - top/bottom으로 위치 조정 */
            top: var(--safe-top) !important;
            bottom: var(--safe-bottom) !important;
            left: 0 !important;
            right: 0 !important;

            /* iOS PWA에서 100svh 사용 */
            height: 100svh !important;
            max-height: 100svh !important;

            /* 모바일 전체화면 스타일 (!important 불필요) */
            margin: 0;
            border-radius: 0;
          }

          /* iOS 11.2 이전 버전 호환성 */
          @supports (padding-top: constant(safe-area-inset-top)) {
            .reading-dialog-ios-safe {
              --safe-top: constant(safe-area-inset-top);
              --safe-bottom: constant(safe-area-inset-bottom);
            }
          }
        }

        /* Note: 모바일 브라우저(non-standalone)에서는 Radix UI 기본 스타일 사용 */
      `}</style>
    </Dialog>
  );
}
