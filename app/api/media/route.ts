import { isAdmin } from '@/lib/server';
import { validOrigin } from '@/lib/auth';
import { storePhoto } from '@/lib/media';
import { BodyError, reply } from '@/lib/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!await isAdmin()) return reply({ error: 'Acesso restrito.' }, 403);
  if (!validOrigin(request)) return reply({ error: 'Origem inválida.' }, 403);
  try { return reply({ url: await storePhoto(request) }, 201); }
  catch (error) { return reply({ error: error instanceof BodyError ? error.message : 'Não foi possível guardar a fotografia.' }, error instanceof BodyError ? error.status : 500); }
}
