/**
 * Lightweight client-side cookie helpers.
 *
 * These utilities are only intended for browser usage. They no-op on the server.
 */

const DEFAULT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7일

export function setClientCookie(name: string, value: string, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${Math.max(
      0,
      maxAgeSeconds
    )}; samesite=lax`;
  } catch {
    // 쿠키 작성 실패는 치명적이지 않으므로 무시 (예: 브라우저 설정)
  }
}

export function deleteClientCookie(name: string) {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; samesite=lax`;
  } catch {
    // 쿠키 삭제 실패는 무시
  }
}
