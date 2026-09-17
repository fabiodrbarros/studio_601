import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { BodyError } from './http';

export const mediaName = /^[a-f0-9-]{36}\.webp$/;
const directory = () => join(dirname(resolve(process.env.STUDIO_DB_PATH || './data/studio601.sqlite')), 'uploads');
export async function storePhoto(request: Request) {
  const type = request.headers.get('content-type')?.split(';')[0];
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type || '')) throw new BodyError('Escolhe uma fotografia JPG, PNG ou WebP.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new BodyError('Fotografia vazia.', 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 10 * 1024 * 1024) { await reader.cancel(); throw new BodyError('A fotografia deve ter até 10 MB.', 413); }
    chunks.push(value);
  }
  const input = Buffer.concat(chunks);
  const png = input.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = input[0] === 255 && input[1] === 216 && input[2] === 255;
  const webp = input.toString('ascii', 0, 4) === 'RIFF' && input.toString('ascii', 8, 12) === 'WEBP';
  if (!(type === 'image/png' && png || type === 'image/jpeg' && jpeg || type === 'image/webp' && webp)) throw new BodyError('O ficheiro não é uma fotografia válida.', 400);
  let output: Buffer;
  try {
    output = await sharp(input, { limitInputPixels: 40000000, failOn: 'warning' })
      .rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
  } catch { throw new BodyError('Não foi possível ler a fotografia. Usa uma imagem até 40 megapíxeis.', 400); }
  const filename = randomUUID() + '.webp';
  await mkdir(directory(), { recursive: true });
  await writeFile(join(directory(), filename), output, { flag: 'wx' });
  return '/api/media/' + filename;
}
export async function readPhoto(filename: string) {
  if (!mediaName.test(filename)) return null;
  try { return await readFile(join(directory(), filename)); } catch { return null; }
}
