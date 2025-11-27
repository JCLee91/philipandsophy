'use client';

import { useEffect, useState } from 'react';
import { searchNaverBooks, cleanBookData, type NaverBook } from '@/lib/naver-book-api';
import { SEARCH_CONFIG } from '@/constants/search';

/**
 * 네이버 책 검색 기능을 위한 커스텀 훅
 *
 * 검색어 입력, 디바운스 처리, 검색 결과 관리를 캡슐화합니다.
 *
 * @example
 * ```tsx
 * const {
 *   query,
 *   setQuery,
 *   results,
 *   isSearching,
 *   showDropdown,
 *   setShowDropdown,
 *   selectBook,
 *   clearSearch,
 * } = useBookSearch({
 *   onSelect: (book) => setSelectedBook(book),
 * });
 * ```
 */

interface UseBookSearchOptions {
  onSelect?: (book: NaverBook) => void;
  minQueryLength?: number;
  debounceDelay?: number;
}

interface UseBookSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: NaverBook[];
  isSearching: boolean;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  selectBook: (book: NaverBook) => void;
  clearSearch: () => void;
}

export function useBookSearch({
  onSelect,
  minQueryLength = 2,
  debounceDelay = SEARCH_CONFIG.DEBOUNCE_DELAY,
}: UseBookSearchOptions = {}): UseBookSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NaverBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // 책 검색 디바운스
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < minQueryLength) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await searchNaverBooks({
          query,
          display: SEARCH_CONFIG.MAX_RESULTS,
          sort: 'sim',
        });
        const cleanedBooks = response.items.map(cleanBookData);
        setResults(cleanedBooks);
        setShowDropdown(cleanedBooks.length > 0);
      } catch {
        setResults([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [query, minQueryLength, debounceDelay]);

  const selectBook = (book: NaverBook) => {
    onSelect?.(book);
    setQuery('');
    setShowDropdown(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return {
    query,
    setQuery,
    results,
    isSearching,
    showDropdown,
    setShowDropdown,
    selectBook,
    clearSearch,
  };
}
