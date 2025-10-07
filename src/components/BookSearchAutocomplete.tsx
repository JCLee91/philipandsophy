'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { searchNaverBooks, cleanBookData, type NaverBook } from '@/lib/naver-book-api';
import { Loader2, Book, X } from 'lucide-react';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { SEARCH_CONFIG } from '@/constants/search';

interface BookSearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onBookSelect: (book: NaverBook) => void;
  disabled?: boolean;
  isAutoFilled?: boolean;
  onClear?: () => void;
}

export default function BookSearchAutocomplete({
  value,
  onChange,
  onBookSelect,
  disabled = false,
  isAutoFilled = false,
  onClear,
}: BookSearchAutocompleteProps) {
  const [searchResults, setSearchResults] = useState<NaverBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState('');
  const [selectedBook, setSelectedBook] = useState<NaverBook | null>(null);
  const searchCache = useRef<Map<string, NaverBook[]>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [value]);

  // Bug #1 Fix: Sync selectedBook when parent clears value
  useEffect(() => {
    if (value === '' && selectedBook !== null) {
      setSelectedBook(null);
      setSearchResults([]);
    }
  }, [value, selectedBook]);

  // 검색 실행 (캐싱 적용)
  useEffect(() => {
    // Bug #2 Fix: Don't search if book already selected
    if (selectedBook) {
      return;
    }

    let aborted = false; // Bug #7 Fix: Abort flag for race condition

    const performSearch = async () => {
      if (debouncedValue.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
        if (!aborted) {
          setSearchResults([]);
          setShowDropdown(false);
        }
        return;
      }

      // 캐시 확인
      const cached = searchCache.current.get(debouncedValue);
      if (cached) {
        if (!aborted) {
          setSearchResults(cached);
          setShowDropdown(cached.length > 0);
        }
        return;
      }

      setIsSearching(true);
      try {
        const response = await searchNaverBooks({
          query: debouncedValue,
          display: SEARCH_CONFIG.MAX_RESULTS,
          sort: 'sim',
        });

        if (aborted) return; // Bug #7 Fix: Don't update if aborted

        const cleanedBooks = response.items.map(cleanBookData);

        // 캐시 저장
        if (searchCache.current.size >= SEARCH_CONFIG.CACHE_MAX_SIZE) {
          const firstKey = searchCache.current.keys().next().value;
          searchCache.current.delete(firstKey);
        }
        searchCache.current.set(debouncedValue, cleanedBooks);

        setSearchResults(cleanedBooks);
        setShowDropdown(cleanedBooks.length > 0);
      } catch (error) {
        if (!aborted) {
          logger.error('책 검색 실패:', error);
          setSearchResults([]);
          setShowDropdown(false);
        }
      } finally {
        if (!aborted) {
          setIsSearching(false);
        }
      }
    };

    performSearch();

    return () => {
      aborted = true; // Bug #7 Fix: Abort on cleanup
    };
  }, [debouncedValue, selectedBook]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bug #3, #6 Fix: Cleanup on unmount
  useEffect(() => {
    return () => {
      searchCache.current.clear(); // Bug #3: Clear cache
      setDebouncedValue(''); // Bug #6: Clear pending debounce
      setSearchResults([]);
      setShowDropdown(false);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBookClick = (book: NaverBook) => {
    setSelectedBook(book);
    onBookSelect(book);
    setShowDropdown(false);
    setSearchResults([]);
    setDebouncedValue(''); // Bug #2 Fix: Clear debounce to prevent race
    setIsSearching(false); // Bug #8 Fix: Clear loading state
  };

  const handleClearSelection = () => {
    setSelectedBook(null);
    onChange('');
    setSearchResults([]);

    // Bug #4 Fix: Notify parent to clear book metadata
    onBookSelect({
      title: '',
      author: '',
      publisher: '',
      isbn: '',
      pubdate: '',
      image: '',
      link: '',
      description: '',
      discount: '',
    });
  };

  const handleInputFocus = () => {
    if (searchResults.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="bookTitle" className="text-base font-semibold">
        2. 책 제목 <span className="text-destructive">*</span>
      </Label>
      <p className="text-sm text-muted-foreground">
        읽고 있는 책의 제목을 입력하면 자동으로 책을 찾아드려요.
      </p>

      {selectedBook ? (
        /* 선택된 책 정보 카드 */
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-start gap-3">
            {/* 책 표지 */}
            {selectedBook.image ? (
              <div className="relative w-12 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                <Image
                  src={selectedBook.image}
                  alt={selectedBook.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-16 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center">
                <Book className="h-6 w-6 text-gray-400" />
              </div>
            )}

            {/* 책 정보 */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
                {selectedBook.title}
              </h4>
              {selectedBook.author && (
                <p className="text-xs text-gray-600 mb-0.5">
                  {selectedBook.author}
                </p>
              )}
              {selectedBook.publisher && (
                <p className="text-xs text-gray-500">
                  {selectedBook.publisher}
                  {selectedBook.pubdate && ` · ${selectedBook.pubdate.slice(0, 4)}년`}
                </p>
              )}
            </div>

            {/* 삭제 버튼 */}
            <button
              type="button"
              onClick={handleClearSelection}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="선택 취소"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      ) : (
        /* 검색 Input */
        <div className="relative">
          <Input
            ref={inputRef}
            id="bookTitle"
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder="예: 어린 왕자"
            disabled={disabled}
            className="pr-10"
            autoComplete="off"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

        {/* 자동완성 드롭다운 */}
        {showDropdown && searchResults.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-y-auto"
          >
            {searchResults.map((book, index) => (
              <button
                key={`${book.isbn}-${index}`}
                type="button"
                onClick={() => handleBookClick(book)}
                className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0"
              >
                {/* 책 표지 */}
                {book.image ? (
                  <div className="relative w-12 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    <Image
                      src={book.image}
                      alt={book.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-16 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center">
                    <Book className="h-6 w-6 text-gray-400" />
                  </div>
                )}

                {/* 책 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="text-xs text-gray-600 truncate">
                      {book.author}
                    </p>
                  )}
                  {book.publisher && (
                    <p className="text-xs text-gray-500 truncate">
                      {book.publisher}
                      {book.pubdate && ` · ${book.pubdate.slice(0, 4)}년`}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        </div>
      )}
    </div>
  );
}
