/**
 * Next.js Proxy Configuration (Next.js 16+)
 *
 * 替代旧的 middleware.ts
 * 用于处理请求代理和重写
 *
 * 语言处理逻辑已在客户端 (src/i18n/client-routing.tsx)
 * API 代理已在 next.config.mjs 中配置
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function proxy(_request: NextRequest) {
  // 简单通过，所有逻辑已在客户端或 next.config.mjs 中处理
  return NextResponse.next();
}

export const config = {
  // 匹配所有路由，除了静态资源和 API
  matcher: ['/((?!api|_next|_vercel|.*\\\\..*).*)'],
};
