import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

function resolveSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

export function isOwnerSupabaseConfigured(): boolean {
  return resolveSupabaseEnv() !== null;
}

/** Server Components, Server Actions, Route Handlers (dashboard host). */
export async function createOwnerServerClient() {
  const env = resolveSupabaseEnv();
  if (!env) {
    throw new Error('Supabase publishable env is not configured');
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll from a Server Component — session refresh runs in proxy / Route Handlers
        }
      },
    },
  });
}

/** Proxy (`src/proxy.ts`) session refresh for dashboard host — do not use in RSC. */
export async function refreshOwnerAuthSession(request: NextRequest): Promise<NextResponse> {
  const env = resolveSupabaseEnv();
  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}

export function applyRefreshedAuthCookies(source: NextResponse, target: NextResponse): void {
  source.cookies.getAll().forEach(({ name, value }) => {
    target.cookies.set(name, value);
  });
}
