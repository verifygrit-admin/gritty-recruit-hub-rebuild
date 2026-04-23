export const config = {
  runtime: 'edge',
};

const COOKIE_NAME = 'grittyos_recruit_auth';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// ---------- HMAC cookie signing ----------

async function hmacSign(value: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyCookie(cookieValue: string | undefined, slug: string, secret: string): Promise<boolean> {
  if (!cookieValue) return false;
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return false;
  const [cookieSlug, signature] = parts;
  if (cookieSlug !== slug) return false;
  const expected = await hmacSign(slug, secret);
  // constant-time compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

async function makeCookie(slug: string, secret: string): Promise<string> {
  const signature = await hmacSign(slug, secret);
  return `${slug}.${signature}`;
}

// ---------- Helpers ----------

function parseRecruitPath(pathname: string): { slug: string; rest: string } | null {
  // /recruits/{slug}                     -> slug, rest = ''
  // /recruits/{slug}/                    -> slug, rest = '/'
  // /recruits/{slug}/anything/else.html  -> slug, rest = '/anything/else.html'
  const m = pathname.match(/^\/recruits\/([^\/]+)(\/.*)?$/);
  if (!m) return null;
  return { slug: m[1], rest: m[2] || '' };
}

function getGuideOrigin(slug: string): string | undefined {
  // Each recruit has a dedicated Vercel project whose origin we store in an env var.
  // Example: RECRUIT_ORIGIN_MONTEIRO = "https://grittyos-guide-monteiro.vercel.app"
  return process.env[`RECRUIT_ORIGIN_${slug.toUpperCase()}`];
}

function getExpectedPassword(slug: string): string | undefined {
  return process.env[`RECRUIT_PASSWORD_${slug.toUpperCase()}`];
}

function getCookieFromHeader(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

function loginPageUrl(origin: string, slug: string, next: string, error?: string): string {
  const url = new URL('/recruits/login', origin);
  url.searchParams.set('slug', slug);
  url.searchParams.set('next', next);
  if (error) url.searchParams.set('error', '1');
  return url.toString();
}

// ---------- Main handler ----------

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only this function is responsible for /recruits/*
  if (!pathname.startsWith('/recruits/')) {
    return new Response('Not Found', { status: 404 });
  }

  // The login page is served as a static file at /recruits/login — let it through
  if (pathname === '/recruits/login' || pathname.startsWith('/recruits/login/')) {
    return new Response(null, { status: 404 }); // should be handled by static assets
  }

  // Handle auth submission
  if (pathname === '/recruits/auth' && request.method === 'POST') {
    return handleAuthSubmit(request, url);
  }

  // All other /recruits/{slug}/* paths require auth
  const parsed = parseRecruitPath(pathname);
  if (!parsed) {
    return new Response('Not Found', { status: 404 });
  }
  const { slug, rest } = parsed;

  const secret = process.env.RECRUIT_AUTH_SECRET;
  if (!secret) {
    return new Response('Server misconfiguration: RECRUIT_AUTH_SECRET not set', { status: 500 });
  }

  const origin = getGuideOrigin(slug);
  if (!origin) {
    return new Response('Guide not found', { status: 404 });
  }

  const cookie = getCookieFromHeader(request.headers.get('cookie'), COOKIE_NAME);
  const authed = await verifyCookie(cookie, slug, secret);

  if (!authed) {
    return Response.redirect(loginPageUrl(url.origin, slug, pathname), 302);
  }

  // Proxy the request to the isolated guide project
  const targetUrl = origin.replace(/\/$/, '') + (rest || '/');
  const upstream = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'accept': request.headers.get('accept') || '*/*',
      'user-agent': request.headers.get('user-agent') || '',
    },
    redirect: 'follow',
  });

  // Strip transfer-encoding & content-encoding headers that Vercel will re-add
  const headers = new Headers(upstream.headers);
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');
  headers.delete('content-length');

  // Prevent caching of authenticated content at shared caches
  headers.set('cache-control', 'private, no-store');

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

async function handleAuthSubmit(request: Request, url: URL): Promise<Response> {
  const formData = await request.formData();
  const slug = String(formData.get('slug') || '').toLowerCase().trim();
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || `/recruits/${slug}`);

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return Response.redirect(loginPageUrl(url.origin, slug, next, 'invalid'), 302);
  }

  const expected = getExpectedPassword(slug);
  const secret = process.env.RECRUIT_AUTH_SECRET;

  if (!expected || !secret) {
    return Response.redirect(loginPageUrl(url.origin, slug, next, 'unknown'), 302);
  }

  // constant-time password compare
  if (password.length !== expected.length) {
    return Response.redirect(loginPageUrl(url.origin, slug, next, 'bad'), 302);
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) {
    return Response.redirect(loginPageUrl(url.origin, slug, next, 'bad'), 302);
  }

  const cookieValue = await makeCookie(slug, secret);
  const safeNext = next.startsWith(`/recruits/${slug}`) ? next : `/recruits/${slug}`;

  const headers = new Headers();
  headers.set('location', safeNext);
  headers.append(
    'set-cookie',
    [
      `${COOKIE_NAME}=${cookieValue}`,
      `Path=/recruits/${slug}`,
      `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
    ].join('; ')
  );

  return new Response(null, { status: 302, headers });
}
