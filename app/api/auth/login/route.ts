import { login } from '@/lib/local-auth.mjs';
import { sessionCookie, validOrigin } from '@/lib/auth';
import { BodyError, jsonBody, reply } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!validOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try {
    const body = await jsonBody(request, 8192);
    if (typeof body.username !== 'string' || body.username.length > 100 || !body.username.trim() ||
        typeof body.password !== 'string' || !body.password || body.password.length > 1024) return reply({ error: 'Credenciais inválidas.' }, 400);
    const result = await login(body.username, body.password);
    if (result.status === 'limited') return reply({ error: 'Demasiadas tentativas. Tenta novamente dentro de 15 minutos.' }, 429, { 'Retry-After': '900' });
    if (result.status !== 'ok' || !result.token) return reply({ error: 'Utilizador ou password incorretos.' }, 401);
    return reply({ ok: true }, 200, { 'Set-Cookie': sessionCookie(result.token) });
  } catch (e) {
    return reply({ error: e instanceof BodyError ? e.message : 'Não foi possível entrar. Tenta novamente.' }, e instanceof BodyError ? e.status : 503);
  }
}
