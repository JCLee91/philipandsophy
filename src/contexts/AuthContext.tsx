'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeFirebase, getFirebaseAuth } from '@/lib/firebase';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let unsubscribe: (() => void) | null = null;

    const setupAuth = async () => {
      try {
        // Firebase 초기화 완료 대기
        initializeFirebase();
        // 통합된 Auth 인스턴스 사용
        const auth = getFirebaseAuth();

        // 컴포넌트가 언마운트되었으면 중단
        if (!mountedRef.current) return;

        // Auth 리스너 등록
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (mountedRef.current) {
            setUser(currentUser);
            setIsLoading(false);

            if (currentUser) {
              logger.info('Auth state: 로그인됨', { email: currentUser.email });
            } else {
              logger.info('Auth state: 로그아웃됨');
            }
          }
        });
      } catch (error) {
        logger.error('Auth 초기화 실패:', error);
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      mountedRef.current = false;
      unsubscribe?.();
    };
  }, []);

  const logout = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      logger.info('로그아웃 성공');
    } catch (error) {
      logger.error('로그아웃 실패:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
