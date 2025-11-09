'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmissionFlowStore } from '@/stores/submission-flow-store';
import { getParticipantById, saveDraft, uploadReadingImage } from '@/lib/firebase';
import { createFileFromUrl } from '@/lib/image-validation';
import { searchNaverBooks, cleanBookData, type NaverBook } from '@/lib/naver-book-api';
import { useToast } from '@/hooks/use-toast';
import BackHeader from '@/components/BackHeader';
import ProgressIndicator from '@/components/submission/ProgressIndicator';
import PageTransition from '@/components/PageTransition';
import UnifiedButton from '@/components/UnifiedButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search } from 'lucide-react';
import { appRoutes } from '@/lib/navigation';
import Image from 'next/image';
import { SEARCH_CONFIG } from '@/constants/search';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function Step2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort');
  const existingSubmissionId = searchParams.get('edit');

  const { participant, isLoading: sessionLoading } = useAuth();
  const { toast } = useToast();
  const keyboardHeight = useKeyboardHeight();
  const footerPaddingBottom = useMemo(
    () =>
      keyboardHeight > 0
        ? `calc(16px + env(safe-area-inset-bottom, 0px))`
        : `calc(60px + env(safe-area-inset-bottom, 0px))`,
    [keyboardHeight]
  );

  const {
    imageFile,
    imageStorageUrl,
    selectedBook,
    manualTitle,
    review,
    participantId,
    participationCode,
    setSelectedBook,
    setManualTitle,
    setReview,
    setImageFile,
    setImageStorageUrl,
    setMetaInfo,
  } = useSubmissionFlowStore();
  const [isLoadingBookTitle, setIsLoadingBookTitle] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NaverBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);


  // Step 1 검증
  useEffect(() => {
    if (!imageFile && !existingSubmissionId) {
      toast({
        title: '이미지를 먼저 업로드해주세요',
        variant: 'destructive',
      });
      const step1Url = appRoutes.submitStep1(cohortId!);
      router.replace(`${step1Url}${existingSubmissionId ? `&edit=${existingSubmissionId}` : ''}`);
    }
  }, [imageFile, existingSubmissionId, cohortId, router, toast]);

  // 인증 확인
  useEffect(() => {
    if (!sessionLoading && (!participant || !cohortId)) {
      router.replace('/app');
    }
  }, [sessionLoading, participant, cohortId, router]);

  // 메타 정보 보강 (Step1을 거치지 않고 들어오는 수정 모드 대비)
  useEffect(() => {
    if (!participant || !cohortId || participantId) return;

    const participationCodeValue = participant.participationCode || participant.id;
    setMetaInfo(participant.id, participationCodeValue, cohortId, existingSubmissionId || undefined);
  }, [participant, participantId, cohortId, existingSubmissionId, setMetaInfo]);

  // 새로운 제출 시작 시 책 관련 상태 초기화 (수정 모드가 아니고 이미지가 없을 때만)
  useEffect(() => {
    // Step1에서 이미지를 선택하고 넘어온 경우는 초기화하지 않음
    // 수정 모드도 초기화하지 않음
    if (!existingSubmissionId && !imageFile && (selectedBook || manualTitle || review)) {
      setSelectedBook(null);
      setManualTitle('');
      setReview('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingSubmissionId, imageFile]); // 의도적으로 dependency 제한

  // 임시저장 자동 불러오기 + 최근 책 정보 자동 로드
  useEffect(() => {
    if (!participant || !cohortId || existingSubmissionId) {
      return;
    }

    const loadDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const { getDraftSubmission, getSubmissionsByParticipant } = await import('@/lib/firebase/submissions');
        const draft = await getDraftSubmission(participant.id, cohortId);

        // Draft 처리 - 책 정보가 있을 때만 사용
        let bookDataLoaded = false;

        if (draft?.bookTitle) {
          // Draft에 책 정보가 있으면 로드
          if (draft.bookAuthor && draft.bookCoverUrl) {
            // 네이버 책 정보가 있으면 selectedBook으로 설정
            setSelectedBook({
              title: draft.bookTitle,
              author: draft.bookAuthor,
              image: draft.bookCoverUrl,
              description: draft.bookDescription || '',
              isbn: '',
              publisher: '',
              pubdate: '',
              link: '',
              discount: '',
            });
          } else {
            // 수동 입력 제목만 있으면 manualTitle로 설정
            setManualTitle(draft.bookTitle);
          }
          bookDataLoaded = true;
        }

        // 감상평은 별도로 처리 (책 정보와 독립적)
        if (draft?.review) {
          setReview(draft.review);
        }

        // Draft에서 실제 데이터를 로드했을 때 (토스트 제거)

        // Draft에 책 정보가 없으면 최근 제출물에서 자동 로드
        if (!bookDataLoaded) {
          const recentSubmissions = await getSubmissionsByParticipant(participant.id);
          const latestApproved = recentSubmissions.find(s => s.status === 'approved');

          if (latestApproved?.bookTitle) {
            // 최근 인증한 책 정보가 있으면 자동 입력
            if (latestApproved.bookAuthor && latestApproved.bookCoverUrl) {
              const bookData = {
                title: latestApproved.bookTitle,
                author: latestApproved.bookAuthor,
                image: latestApproved.bookCoverUrl,
                description: latestApproved.bookDescription || '',
                isbn: '',
                publisher: '',
                pubdate: '',
                link: '',
                discount: '',
              };
              setSelectedBook(bookData);
            } else {
              setManualTitle(latestApproved.bookTitle);
            }
          } else {
            // 최근 제출물도 없으면 participant의 currentBookTitle 로드
            const participantData = await getParticipantById(participant.id);
            if (participantData?.currentBookTitle) {
              setManualTitle(participantData.currentBookTitle);
            }
          }
        }
      } catch (error) {
        logger.error('[Step2] Error during auto-load', error);
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant, cohortId, existingSubmissionId]); // 의도적으로 dependency 제한 - 초기 로드만 수행

  useEffect(() => {
    if (!existingSubmissionId || (selectedBook || manualTitle)) return;

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
            if (!cancelled) {
              setImageFile(file, submission.bookImageUrl, submission.bookImageUrl);
            }
          } catch (error) {
            if (!cancelled) {
              setImageFile(null, submission.bookImageUrl, submission.bookImageUrl);
            }
          }
          if (!cancelled) {
            setImageStorageUrl(submission.bookImageUrl);
          }
        }

        if (submission.bookTitle) {
          if (submission.bookAuthor || submission.bookCoverUrl || submission.bookDescription) {
            setSelectedBook({
              title: submission.bookTitle,
              author: submission.bookAuthor || '',
              image: submission.bookCoverUrl || '',
              description: submission.bookDescription || '',
              isbn: '',
              publisher: '',
              pubdate: '',
              link: '',
              discount: '',
            });
            setManualTitle('');
          } else {
            setSelectedBook(null);
            setManualTitle(submission.bookTitle);
          }
        }

        if (submission.review) {
          setReview(submission.review);
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: '제출물 불러오기 실패',
            description: '이전 제출을 불러오지 못했습니다. 다시 시도해주세요.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDraft(false);
        }
      }
    };

    loadExistingSubmission();

    return () => {
      cancelled = true;
    };
  }, [existingSubmissionId, selectedBook, manualTitle, imageStorageUrl, setSelectedBook, setManualTitle, setReview, setImageFile, setImageStorageUrl, toast]);

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
        const response = await searchNaverBooks({
          query: searchQuery,
          display: SEARCH_CONFIG.MAX_RESULTS,
          sort: 'sim',
        });
        const cleanedBooks = response.items.map(cleanBookData);
        setSearchResults(cleanedBooks);
        setShowDropdown(cleanedBooks.length > 0);
      } catch (error) {
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
    const confirmed = window.confirm(
      '책을 변경하시겠습니까?\n변경하면 현재 선택된 책 정보가 초기화됩니다.'
    );

    if (confirmed) {
      setSelectedBook(null);
      setManualTitle('');
    }
  };

  const handleSaveDraft = async () => {
    if (!participantId || !participationCode) {
      toast({
        title: '세션 정보가 없습니다',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const draftData: {
        bookImageUrl?: string;
        bookTitle?: string;
        bookAuthor?: string;
        bookCoverUrl?: string;
        bookDescription?: string;
        review?: string;
      } = {};

      // 이미지가 있으면 업로드 (File 객체인 경우만)
      if (imageFile && imageFile instanceof File && !imageStorageUrl) {
        const uploadedUrl = await uploadReadingImage(imageFile, participantId, cohortId);
        draftData.bookImageUrl = uploadedUrl;
        setImageStorageUrl(uploadedUrl);
      } else if (imageStorageUrl) {
        draftData.bookImageUrl = imageStorageUrl;
      }

      // 각 필드는 값이 있을 때만 포함 (undefined로 덮어쓰기 방지)
      if (selectedBook?.title || manualTitle) {
        draftData.bookTitle = selectedBook?.title || manualTitle;
      }
      if (selectedBook?.author) {
        draftData.bookAuthor = selectedBook.author;
      }
      if (selectedBook?.image) {
        draftData.bookCoverUrl = selectedBook.image;
      }
      if (selectedBook?.description) {
        draftData.bookDescription = selectedBook.description;
      }
      if (review) {
        draftData.review = review;
      }

      await saveDraft(participantId, participationCode, draftData);

      toast({
        title: '임시 저장되었습니다',
        description: '언제든 다시 돌아와서 작성을 이어갈 수 있습니다.',
      });

      // 페이지 이동 제거 - 현재 페이지에 머물기
    } catch (error) {
      toast({
        title: '임시 저장 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleNext = async () => {
    // 책 정보 검증: selectedBook 또는 manualTitle 중 하나는 있어야 함
    if (!selectedBook && !manualTitle.trim()) {
      toast({
        title: '책 제목을 입력해주세요',
        description: '검색 결과에서 선택하거나 직접 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!review.trim()) {
      toast({
        title: '감상평을 입력해주세요',
        description: '읽은 내용에 대한 생각이나 느낌을 작성해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // 자동 임시저장
      if (!existingSubmissionId && participantId && participationCode) {
        const draftData: {
          bookImageUrl?: string;
          bookTitle?: string;
          bookAuthor?: string;
          bookCoverUrl?: string;
          bookDescription?: string;
          review?: string;
        } = {};

        // 이미지가 있으면 업로드 (File 객체인 경우만)
        if (imageFile && imageFile instanceof File && !imageStorageUrl) {
          const uploadedUrl = await uploadReadingImage(imageFile, participantId, cohortId);
          draftData.bookImageUrl = uploadedUrl;
          setImageStorageUrl(uploadedUrl);
        } else if (imageStorageUrl) {
          draftData.bookImageUrl = imageStorageUrl;
        }

        // 각 필드는 값이 있을 때만 포함
        if (selectedBook?.title || manualTitle) {
          draftData.bookTitle = selectedBook?.title || manualTitle;
        }
        if (selectedBook?.author) {
          draftData.bookAuthor = selectedBook.author;
        }
        if (selectedBook?.image) {
          draftData.bookCoverUrl = selectedBook.image;
        }
        if (selectedBook?.description) {
          draftData.bookDescription = selectedBook.description;
        }
        if (review) {
          draftData.review = review;
        }

        await saveDraft(participantId, participationCode, draftData);
      }

      router.push(`${appRoutes.submitStep3}?cohort=${cohortId}${existingSubmissionId ? `&edit=${existingSubmissionId}` : ''}`);
    } catch (error) {
      console.error('Next step failed:', error);
      toast({
        title: '다음 단계로 이동 실패',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false); // 항상 해제
    }
  };

  if (sessionLoading || !participant || !cohortId || isLoadingDraft) {
    return <LoadingSpinner message="로딩 중..." />;
  }

  return (
    <PageTransition>
      <div className="app-shell flex flex-col overflow-hidden bg-background">
        <BackHeader onBack={handleBack} title="독서 인증하기" variant="left" />
        <div className="fixed top-14 left-0 right-0 z-[998]">
          <ProgressIndicator currentStep={2} />
        </div>

        <main
          className="app-main-content flex-1 overflow-y-auto pt-[57px]"
          style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 32 : 32 }}
        >
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-6">
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
                        // 엔터키를 누르면 검색어를 수동 입력 제목으로 사용
                        setManualTitle(searchQuery.trim());
                        setSearchQuery('');
                        setShowDropdown(false);
                      }
                    }}
                    placeholder="도서명을 검색하거나 직접 입력 후 엔터"
                    className="pl-10 h-12 text-base"
                    disabled={isLoadingBookTitle}
                  />
                </div>

                {/* 검색 결과 드롭다운 */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[400px] overflow-y-auto">
                    {searchResults.map((book, index) => (
                      <button
                        key={`${book.isbn}-${index}`}
                        type="button"
                        onClick={() => handleBookSelect(book)}
                        className="w-full flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0"
                      >
                        {book.image && (
                          <Image
                            src={book.image}
                            alt={book.title}
                            width={60}
                            height={90}
                            className="rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm line-clamp-2 mb-1">{book.title}</h4>
                          <p className="text-xs text-gray-600">{book.author}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 수동 입력 안내 */}
                {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    검색 결과가 없습니다. 엔터를 누르면{' '}
                    <span className="font-medium">{searchQuery}</span>
                    를 직접 입력할 수 있어요.
                  </p>
                )}
              </div>
            )}

            {/* 수동 입력된 책 제목 표시 */}
            {!selectedBook && manualTitle && (
              <div className="relative border-b-[2px] border-solid rounded-t-[4px] px-3 py-3 min-h-[67px] bg-gray-50" style={{ borderBottomColor: '#6b7280' }}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-[14px] font-bold leading-[1.4] text-[#31363e] tracking-[-0.14px]">
                        {manualTitle}
                      </p>
                      <button
                        type="button"
                        onClick={() => setManualTitle('')}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                        aria-label="제목 지우기"
                      >
                        <Image
                          src="/image/today-library/ri_pencil-fill.svg"
                          alt="제목 변경"
                          width={18}
                          height={18}
                        />
                      </button>
                    </div>
                    <p className="text-[12px] leading-[1.4] text-[#8f98a3] tracking-[-0.12px]">
                      직접 입력
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 선택된 책 정보 (프로필북 디자인 복사) */}
            {selectedBook && (
              <div className="relative border-b-[2px] border-solid rounded-t-[4px] px-3 py-3 min-h-[67px] bg-blue-50" style={{ borderBottomColor: '#3b82f6' }}>
                <div className="flex items-start gap-3 pr-[110px]">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-[14px] font-bold leading-[1.4] text-[#31363e] tracking-[-0.14px]">
                        {selectedBook.title}
                      </p>
                      <button
                        type="button"
                        onClick={handleEditBook}
                        className="flex-shrink-0 p-1 hover:bg-blue-100 rounded transition-colors"
                        aria-label="책 변경"
                      >
                        <Image
                          src="/image/today-library/ri_pencil-fill.svg"
                          alt="책 변경"
                          width={18}
                          height={18}
                        />
                      </button>
                    </div>
                    {selectedBook.author && (
                      <p className="text-[12px] leading-[1.4] text-[#8f98a3] tracking-[-0.12px]">
                        {selectedBook.author}
                      </p>
                    )}
                  </div>
                </div>
                {/* 책 표지 - 10% 축소 (81x119px), 상단 튀어나오게 */}
                {selectedBook.image && (
                  <div className="absolute right-3 bottom-0 w-[81px] h-[119px] bg-white rounded-[4px] overflow-hidden shadow-md">
                    <Image
                      src={selectedBook.image}
                      alt="책 표지"
                      fill
                      sizes="81px"
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 감상평 입력 */}
            <div className="space-y-3">
              <h4 className="font-bold text-base">
                읽은 내용에 대한 생각이나 느낌을<br />자유롭게 작성해 주세요
              </h4>
              <Textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder='예시) "너무 슬픈 일을 겪은 사람은, 슬프다는 말조차 쉽게 할 수 없게 돼." 이 문장은 미도리의 밝음 뒤에 숨어 있는 깊은 슬픔을 보여준다.'
                className="min-h-[280px] resize-none text-sm leading-relaxed rounded-xl border-gray-300 focus:border-blue-400 focus:ring-blue-400"
                disabled={!selectedBook && !manualTitle.trim()}
              />
              <p className="text-xs text-muted-foreground text-right">
                ({review.length}자)
              </p>
            </div>
          </div>
        </main>

        {/* 하단 버튼 */}
        <div className="border-t bg-white">
          <div
            className="mx-auto flex w-full max-w-xl gap-2 px-6 pt-4"
            style={{ paddingBottom: footerPaddingBottom }}
          >
            {!existingSubmissionId && (
              <UnifiedButton variant="outline" onClick={handleSaveDraft} disabled={isSaving} className="flex-1">
                {isSaving ? '저장 중...' : '임시 저장하기'}
              </UnifiedButton>
            )}
            <UnifiedButton
              onClick={handleNext}
              disabled={(!selectedBook && !manualTitle.trim()) || !review.trim() || isSaving || isProcessing}
              loading={isProcessing}
              loadingText="저장 중..."
              className={existingSubmissionId ? 'w-full' : 'flex-1'}
            >
              다음
            </UnifiedButton>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default function Step2Page() {
  return (
    <Suspense fallback={<LoadingSpinner message="로딩 중..." />}>
      <Step2Content />
    </Suspense>
  );
}
