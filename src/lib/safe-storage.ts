/**
 * Safe Storage helpers
 *
 * 일부 브라우저(iOS Safari, 프라이빗 모드 등)에서는 localStorage 접근/쓰기에서
 * SecurityError / QuotaExceededError가 발생할 수 있습니다.
 * 이 파일은 "앱 전체 크래시"를 막기 위해 Storage API를 안전하게 감쌉니다.
 */

export type SyncStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function isLocalStorageUsable(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('localStorage' in window)) return false;

  try {
    const testKey = '__pns_ls_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function createSafeLocalStorage(): SyncStorage {
  const storage = typeof window !== 'undefined' ? window.localStorage : undefined;

  return {
    getItem: (key: string) => {
      try {
        return storage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        storage?.setItem(key, value);
      } catch {
        // QuotaExceededError 등은 무시하고 persistence만 포기 (앱은 계속 동작)
      }
    },
    removeItem: (key: string) => {
      try {
        storage?.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

