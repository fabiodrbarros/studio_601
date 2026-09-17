export const reply = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

export async function jsonBody(request: Request, limit: number) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new BodyError('Formato inválido.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new BodyError('Dados inválidos.', 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new BodyError('Dados demasiado grandes.', 413); }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  }
  catch { throw new BodyError('Dados inválidos.', 400); }
}
export class BodyError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
