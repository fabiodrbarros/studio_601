import { cookies } from 'next/headers';
import { logout, SESSION_COOKIE } from '@/lib/local-auth.mjs';
import { sessionCookie, validOrigin } from '@/lib/auth';
import { reply } from '@/lib/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!validOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  logout((await cookies()).get(SESSION_COOKIE)?.value);
  return reply({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', true) });
}
