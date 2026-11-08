// Cloudflare Workers entry point for Garieva Prince
// This file serves as the bridge between Next.js and Cloudflare Workers
// It handles API routes that need to run on Cloudflare

import { NextResponse } from 'next/server';

export async function onRequest(request, env) {
  // For now, all requests are handled by Next.js dev server or deployed Next.js
  // This entry point will be used when running on Cloudflare Workers
  
  const url = new URL(request.url);
  
  // Health check - always respond immediately
  if (url.pathname === '/health') {
    return NextResponse.json(
      { status: 'ok', service: 'garieva-prince' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
  
  // Default: proxy to Next.js dev server or Cloudflare function
  // Implementation depends on deployment target
  
  return NextResponse.error();
}