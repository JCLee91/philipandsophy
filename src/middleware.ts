import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const APP_LOGIN_PATHS = new Set(['/app', '/app/']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 이 미들웨어는 /app 하위 경로만 보호한다.
  if (!pathname.startsWith('/app')) {
    return NextResponse.next();
  }

  const participantCookie = request.cookies.get('pns-participant');

  // 보호가 필요한 경로인데 참가자 쿠키가 없다면 /app 로그인 화면으로 리다이렉트
  if ((!participantCookie || !participantCookie.value) && !APP_LOGIN_PATHS.has(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/app';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
