import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIE, verifyToken } from '@/lib/auth'

export function proxy(request: NextRequest) {
  const accessCode = process.env.ACCESS_CODE
  const { pathname } = request.nextUrl

  if (!accessCode) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          code: 'MISSING_ACCESS_CODE',
          message: '服务端未配置 ACCESS_CODE',
        },
        { status: 500 },
      )
    }

    return NextResponse.redirect(new URL('/gate', request.url))
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value

  if (verifyToken(token, accessCode)) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: '请先输入访问口令' },
      { status: 401 },
    )
  }

  return NextResponse.redirect(new URL('/gate', request.url))
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|gate|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
