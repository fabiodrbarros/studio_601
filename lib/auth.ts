import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_SECONDS, sessionAdministrator } from './local-auth.mjs';

export async function currentAdministrator() {
  return sessionAdministrator((await cookies()).get(SESSION_COOKIE)?.value);
}
export function appOrigin() { return new URL(process.env.APP_ORIGIN || 'http://127.0.0.1:3000').origin; }
export function validOrigin(request: Request) { return request.headers.get('origin') === appOrigin(); }
export function sessionCookie(token: string, clear = false) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${appOrigin().startsWith('https:') ? '; Secure' : ''}`;
}
