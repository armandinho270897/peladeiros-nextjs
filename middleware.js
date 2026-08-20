import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

function isPublicPath(pathname) {
  if (pathname === '/login') return true;
  if (pathname.startsWith('/auth/')) return true;
  if (pathname.startsWith('/pelada/')) return true;
  if (pathname.startsWith('/time/')) return true;
  return false;
}

function redirectTo(pathname, request, response, extraParams) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  if (extraParams) Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    return redirectTo('/login', request, response, { next: pathname });
  }

  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();

  if (!profile && pathname !== '/completar-perfil') {
    return redirectTo('/completar-perfil', request, response);
  }

  if (profile && pathname === '/completar-perfil') {
    return redirectTo('/', request, response);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|leaflet/|api/).*)'],
};
