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

  // 검색 실행 (캐싱 적용)
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedValue.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      // 캐시 확인
      const cached = searchCache.current.get(debouncedValue);
      if (cached) {
        setSearchResults(cached);
        setShowDropdown(cached.length > 0);
        return;
      }

      setIsSearching(true);
      try {
        const response = await searchNaverBooks({
          query: debouncedValue,
          display: SEARCH_CONFIG.MAX_RESULTS,
          sort: 'sim',
        });

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
        logger.error('책 검색 실패:', error);
        setSearchResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedValue]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBookClick = (book: NaverBook) => {
    onBookSelect(book);
    setShowDropdown(false);
    setSearchResults([]);
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

      <div className="relative">
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
        </div>

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
                      {book.publisher} · {book.pubdate.slice(0, 4)}년
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 자동 완성 힌트 배지 */}
      {isAutoFilled && value && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            📚 이전 독서 계속
          </Badge>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              다른 책으로 변경
            </button>
          )}
        </div>
      )}
    </div>
  );
}
