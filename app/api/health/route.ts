import { database } from '@/lib/local-db.mjs';
import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    database().prepare('SELECT version FROM catalog LIMIT 1').get();
    const directory = dirname(resolve(process.env.STUDIO_DB_PATH || './data/studio601.sqlite'));
    await mkdir(join(directory, 'uploads'), { recursive: true });
    await access(directory, constants.R_OK | constants.W_OK);
    await access(join(directory, 'uploads'), constants.R_OK | constants.W_OK);
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
