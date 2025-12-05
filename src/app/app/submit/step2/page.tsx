'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSubmissionFlowStore } from '@/stores/submission-flow-store';
import { getParticipantById, saveDraft, uploadReadingImage, uploadImageFromUrl } from '@/lib/firebase';
import { createFileFromUrl } from '@/lib/image-validation';
import { searchNaverBooks, cleanBookData, type NaverBook } from '@/lib/naver-book-api';
import { useSubmissionCommon } from '@/hooks/use-submission-common';
import SubmissionLayout from '@/components/submission/SubmissionLayout';
import UnifiedButton from '@/components/UnifiedButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Loader2, Check } from 'lucide-react';
import { useDebounce } from 'react-use';
import { appRoutes } from '@/lib/navigation';
import Image from 'next/image';
import { SEARCH_CONFIG } from '@/constants/search';
import { SUBMISSION_VALIDATION } from '@/constants/validation';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function Step2Content() {
  const {
    router,
    cohortId,
    existingSubmissionId,
    participant,
    sessionLoading,
    participantId,
    participationCode,
    submissionDate,
    mainPaddingBottom,
    footerPaddingBottom,
    toast,
    handleBack,
  } = useSubmissionCommon();

  const {
    imageFile,
    imageStorageUrl,
    selectedBook,
    manualTitle,
    review: globalReview,
    setSelectedBook,
    setManualTitle,
    setReview: setGlobalReview,
    setImageFile,
    setImageStorageUrl,
    isEBook,
  } = useSubmissionFlowStore();

  // Local state for performance
  const [localReview, setLocalReview] = useState(globalReview);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NaverBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const loadedSubmissionId = useRef<string | null>(null);

  // Sync local state with global
  useEffect(() => {
    setLocalReview(globalReview);
  }, [globalReview]);

  // Debounce auto-save
  useDebounce(
    async () => {
      if (localReview === globalReview) return;
      setGlobalReview(localReview);

      if (participantId && participationCode && localReview.length > 5 && !isProcessing) {
        await performAutoSave(localReview);
      }
    },
    1000,
    [localReview]
  );

  const performAutoSave = async (currentReview: string) => {
    if (!participantId || !participationCode) return;
    setIsAutoSaving(true);
    try {
      const draftData: any = {
        review: currentReview,
        ...(existingSubmissionId && { editingSubmissionId: existingSubmissionId }),
        isEBook,
      };
      if (selectedBook?.title || manualTitle) draftData.bookTitle = selectedBook?.title || manualTitle;
      if (isEBook && selectedBook?.image) {
        draftData.bookImageUrl = imageStorageUrl || selectedBook.image;
        draftData.bookCoverUrl = selectedBook.image;
      }
      if (cohortId) draftData.cohortId = cohortId;
      await saveDraft(participantId, participationCode, draftData, undefined, submissionDate || undefined);
      setLastSavedAt(new Date());
    } catch (error) {
      console.error('Auto-save failed', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Step 1 검증
  useEffect(() => {
    if (!imageFile && !existingSubmissionId && !isEBook) {
      toast({ title: '이미지를 먼저 업로드해주세요', variant: 'destructive' });
      router.replace(`${appRoutes.submitStep1(cohortId!)}${existingSubmissionId ? `&edit=${existingSubmissionId}` : ''}`);
    }
  }, [imageFile, existingSubmissionId, cohortId, router, toast, isEBook]);

  // 새로운 제출 시작 시 책 관련 상태 초기화
  useEffect(() => {
    if (!existingSubmissionId && !imageFile && (selectedBook || manualTitle || globalReview)) {
      if (!isEBook) {
        setSelectedBook(null);
        setManualTitle('');
        setGlobalReview('');
      }
    }
  }, [existingSubmissionId, imageFile, isEBook]);

  // 임시저장 + 최근 책 정보 자동 로드
  useEffect(() => {
    if (!participant || !cohortId || existingSubmissionId) return;

    const loadDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const { getDraftSubmission, getSubmissionsByParticipant } = await import('@/lib/firebase/submissions');
        const draft = await getDraftSubmission(participant.id, cohortId, submissionDate || undefined);
        let bookDataLoaded = false;

        if (draft?.bookTitle) {
          if (draft.bookAuthor && draft.bookCoverUrl) {
            setSelectedBook({
              title: draft.bookTitle, author: draft.bookAuthor, image: draft.bookCoverUrl,
              description: draft.bookDescription || '', isbn: '', publisher: '', pubdate: '', link: '', discount: '',
            });
          } else {
            setManualTitle(draft.bookTitle);
          }
          bookDataLoaded = true;
        }

        if (draft?.review) {
          setGlobalReview(draft.review);
          setLocalReview(draft.review);
        }

        if (!bookDataLoaded) {
          const recentSubmissions = await getSubmissionsByParticipant(participant.id);
          const latestApproved = recentSubmissions.find(s => s.status === 'approved');

          if (latestApproved?.bookTitle) {
            if (latestApproved.bookAuthor && latestApproved.bookCoverUrl) {
              setSelectedBook({
                title: latestApproved.bookTitle, author: latestApproved.bookAuthor, image: latestApproved.bookCoverUrl,
                description: latestApproved.bookDescription || '', isbn: '', publisher: '', pubdate: '', link: '', discount: '',
              });
            } else {
              setManualTitle(latestApproved.bookTitle);
            }
          } else {
            const participantData = await getParticipantById(participant.id);
            if (participantData?.currentBookTitle) setManualTitle(participantData.currentBookTitle);
          }
        }
      } catch (error) {
        logger.error('[Step2] Error during auto-load', error);
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
  }, [participant, cohortId, existingSubmissionId]);

  // 기존 제출물 불러오기
  useEffect(() => {
    if (!existingSubmissionId || loadedSubmissionId.current === existingSubmissionId) return;

    let cancelled = false;
    const loadExistingSubmission = async () => {
      setIsLoadingDraft(true);
      try {
        const { getSubmissionById } = await import('@/lib/firebase/submissions');
        const submission = await getSubmissionById(existingSubmissionId);
        if (!submission || cancelled) return;

        if (submission.bookImageUrl && !imageStorageUrl) {
          try {
            const file = await createFileFromUrl(submission.bookImageUrl);
            if (!cancelled) setImageFile(file, submission.bookImageUrl, submission.bookImageUrl);
          } catch {
            if (!cancelled) setImageFile(null, submission.bookImageUrl, submission.bookImageUrl);
          }
          if (!cancelled) setImageStorageUrl(submission.bookImageUrl);
        }

        if (submission.bookTitle) {
          if (submission.bookAuthor || submission.bookCoverUrl || submission.bookDescription) {
            setSelectedBook({
              title: submission.bookTitle, author: submission.bookAuthor || '', image: submission.bookCoverUrl || '',
              description: submission.bookDescription || '', isbn: '', publisher: '', pubdate: '', link: '', discount: '',
            });
            setManualTitle('');
          } else {
            setSelectedBook(null);
            setManualTitle(submission.bookTitle);
          }
        }

        if (submission.review) {
          setGlobalReview(submission.review);
          setLocalReview(submission.review);
        }
        loadedSubmissionId.current = existingSubmissionId;
      } catch {
        if (!cancelled) toast({ title: '제출물 불러오기 실패', variant: 'destructive' });
      } finally {
        if (!cancelled) setIsLoadingDraft(false);
      }
    };

    loadExistingSubmission();
    return () => { cancelled = true; };
  }, [existingSubmissionId, imageStorageUrl, setSelectedBook, setManualTitle, setGlobalReview, setImageFile, setImageStorageUrl, toast]);

  // 책 검색 디바운스
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await searchNaverBooks({ query: searchQuery, display: SEARCH_CONFIG.MAX_RESULTS, sort: 'sim' });
        const cleanedBooks = response.items.map(cleanBookData);
        setSearchResults(cleanedBooks);
        setShowDropdown(cleanedBooks.length > 0);
      } catch {
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleBookSelect = (book: NaverBook) => {
    setSelectedBook(book);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleEditBook = () => {
    if (!window.confirm('책을 변경하시겠습니까?\n변경하면 현재 선택된 책 정보가 초기화됩니다.')) return;
    if (selectedBook) setSearchQuery(selectedBook.title);
    setSelectedBook(null);
    setManualTitle('');
    if (isEBook) setImageStorageUrl(null);
  };

  const handleNext = async () => {
    if (!selectedBook && !manualTitle.trim()) {
      toast({ title: '책 제목을 입력해주세요', description: '검색 결과에서 선택하거나 직접 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (isEBook && !selectedBook && manualTitle.trim()) {
      toast({ title: '전자책 인증은 책 검색이 필요합니다', description: '표지 사진을 가져오기 위해 책을 검색해서 선택해주세요.', variant: 'destructive' });
      return;
    }
    if (!localReview.trim()) {
      toast({ title: '감상평을 입력해주세요', variant: 'destructive' });
      return;
    }
    if (localReview.length < SUBMISSION_VALIDATION.MIN_REVIEW_LENGTH) {
      toast({ title: `최소 ${SUBMISSION_VALIDATION.MIN_REVIEW_LENGTH}자 이상 작성해주세요`, description: `현재 ${localReview.length}자 입력됨`, variant: 'destructive' });
      return;
    }

    setIsProcessing(true);

    if (!existingSubmissionId && participantId && participationCode) {
      try {
        const draftData: any = { isEBook };
        if (imageFile && imageFile instanceof File && !imageStorageUrl) {
          const uploadedUrl = await uploadReadingImage(imageFile, participationCode, cohortId);
          draftData.bookImageUrl = uploadedUrl;
          setImageStorageUrl(uploadedUrl);
        } else if (imageStorageUrl) {
          draftData.bookImageUrl = imageStorageUrl;
        }

        if (isEBook && selectedBook?.image && !imageStorageUrl) {
          try {
            const uploadedCoverUrl = await uploadImageFromUrl(selectedBook.image, participationCode, cohortId!);
            draftData.bookImageUrl = uploadedCoverUrl;
            draftData.bookCoverUrl = selectedBook.image;
            setImageStorageUrl(uploadedCoverUrl);
          } catch {
            draftData.bookImageUrl = selectedBook.image;
            draftData.bookCoverUrl = selectedBook.image;
          }
        } else if (isEBook && imageStorageUrl) {
          draftData.bookImageUrl = imageStorageUrl;
        }

        if (selectedBook?.title || manualTitle) draftData.bookTitle = selectedBook?.title || manualTitle;
        if (selectedBook?.author) draftData.bookAuthor = selectedBook.author;
        if (selectedBook?.image) draftData.bookCoverUrl = selectedBook.image;
        if (selectedBook?.description) draftData.bookDescription = selectedBook.description;
        if (localReview) draftData.review = localReview;
        if (cohortId) draftData.cohortId = cohortId;

        await saveDraft(participantId, participationCode, draftData, undefined, submissionDate || undefined);
      } catch (error) {
        logger.error('[Step2] Draft save failed (continuing)', error);
      }
    }

    try {
      router.push(`${appRoutes.submitStep3}?cohort=${cohortId}${existingSubmissionId ? `&edit=${existingSubmissionId}` : ''}`);
    } catch (error) {
      logger.error('[Step2] Navigation failed', error);
      toast({ title: '다음 단계로 이동 실패', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (sessionLoading || !participant || !cohortId || isLoadingDraft) {
    return <LoadingSpinner message="로딩 중..." />;
  }

  return (
    <SubmissionLayout
      currentStep={2}
      onBack={handleBack}
      mainPaddingBottom={mainPaddingBottom}
      footerPaddingBottom={footerPaddingBottom}
      footer={
        <UnifiedButton
          onClick={handleNext}
          disabled={isSaving || isProcessing}
          loading={isProcessing}
          loadingText="저장 중..."
          className={cn(
            existingSubmissionId ? 'w-full' : 'flex-1',
            ((!selectedBook && !manualTitle.trim()) || !localReview.trim() || localReview.length < SUBMISSION_VALIDATION.MIN_REVIEW_LENGTH) && "opacity-50"
          )}
        >
          다음
        </UnifiedButton>
      }
    >
      <div className="space-y-1">
        <h2 className="text-lg font-bold">책 제목</h2>
      </div>

      {/* 검색 입력 */}
      {!selectedBook && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  setManualTitle(searchQuery.trim());
                  setSearchQuery('');
                  setShowDropdown(false);
                }
              }}
              placeholder="도서명을 검색하거나 직접 입력 후 엔터"
              className="pl-10 h-12 text-base"
            />
          </div>

          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[400px] overflow-y-auto">
              {searchResults.map((book, index) => (
                <button
                  key={`${book.isbn}-${index}`}
                  type="button"
                  onClick={() => handleBookSelect(book)}
                  className="w-full flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0"
                >
                  {book.image && <Image src={book.image} alt={book.title} width={60} height={90} className="rounded object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-2 mb-1">{book.title}</h4>
                    <p className="text-xs text-gray-600">{book.author}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">
              검색 결과가 없습니다. 엔터를 누르면 <span className="font-medium">{searchQuery}</span>를 직접 입력할 수 있어요.
            </p>
          )}
        </div>
      )}

      {/* 수동 입력된 책 제목 */}
      {!selectedBook && manualTitle && (
        <div className="relative border-b-[2px] border-solid rounded-t-[4px] px-3 py-3 min-h-[67px] bg-gray-50" style={{ borderBottomColor: '#6b7280' }}>
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-[14px] font-bold leading-[1.4] text-[#31363e] tracking-[-0.14px]">{manualTitle}</p>
                <button type="button" onClick={() => { setSearchQuery(manualTitle); setManualTitle(''); }} className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors">
                  <Image src="/image/today-library/ri_pencil-fill.svg" alt="제목 수정" width={18} height={18} />
                </button>
              </div>
              <p className="text-[12px] leading-[1.4] text-[#8f98a3] tracking-[-0.12px]">직접 입력</p>
            </div>
          </div>
        </div>
      )}

      {/* 선택된 책 정보 */}
      {selectedBook && (
        <div className="relative border-b-[2px] border-solid rounded-t-[4px] px-3 py-3 min-h-[67px] bg-blue-50" style={{ borderBottomColor: '#3b82f6' }}>
          <div className="flex items-start gap-3 pr-[110px]">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-[14px] font-bold leading-[1.4] text-[#31363e] tracking-[-0.14px]">{selectedBook.title}</p>
                <button type="button" onClick={handleEditBook} className="flex-shrink-0 p-1 hover:bg-blue-100 rounded transition-colors">
                  <Image src="/image/today-library/ri_pencil-fill.svg" alt="책 변경" width={18} height={18} />
                </button>
              </div>
              {selectedBook.author && <p className="text-[12px] leading-[1.4] text-[#8f98a3] tracking-[-0.12px]">{selectedBook.author}</p>}
            </div>
          </div>
          {selectedBook.image && (
            <div className="absolute right-3 bottom-0 w-[81px] h-[119px] bg-white rounded-[4px] overflow-hidden shadow-md">
              <Image src={selectedBook.image} alt="책 표지" fill sizes="81px" className="object-contain" />
            </div>
          )}
        </div>
      )}

      {/* 감상평 입력 */}
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <h4 className="font-bold text-base">읽은 내용에 대한 생각이나 느낌을<br />자유롭게 작성해 주세요</h4>
          <div className="flex items-center gap-2 mb-1">
            {isAutoSaving ? (
              <>
                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                <span className="text-[10px] text-blue-500 font-medium">저장 중</span>
              </>
            ) : lastSavedAt ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-[10px] text-green-600 font-medium">저장됨</span>
              </>
            ) : null}
            <span className={`text-[10px] font-medium transition-colors ${localReview.length < SUBMISSION_VALIDATION.MIN_REVIEW_LENGTH ? 'text-red-500' : 'text-blue-500'}`}>
              {localReview.length}/{SUBMISSION_VALIDATION.MIN_REVIEW_LENGTH}자
            </span>
          </div>
        </div>
        <Textarea
          value={localReview}
          onChange={(e) => setLocalReview(e.target.value)}
          placeholder='예시) "너무 슬픈 일을 겪은 사람은, 슬프다는 말조차 쉽게 할 수 없게 돼." 이 문장은 미도리의 밝음 뒤에 숨어 있는 깊은 슬픔을 보여준다.'
          className="min-h-[280px] resize-none text-sm leading-relaxed rounded-xl border-gray-300 focus:border-blue-400 focus:ring-blue-400 p-4"
          disabled={!selectedBook && !manualTitle.trim()}
        />
        {localReview.length > 0 && <p className="text-xs text-gray-400 px-1">작성 중인 내용은 자동으로 저장됩니다</p>}
      </div>
    </SubmissionLayout>
  );
}

export default function Step2Page() {
  return (
    <Suspense fallback={<LoadingSpinner message="로딩 중..." />}>
      <Step2Content />
    </Suspense>
  );
}
