import { createInterface, emitKeypressEvents } from 'node:readline';
import { setAdministrator } from '../lib/local-auth.mjs';

function question(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, value => { rl.close(); resolve(value); }));
}
function password(prompt) {
  if (!process.stdin.isTTY) throw new Error('Executa este comando num terminal interativo. A password não deve ser passada em argumentos ou ficheiros.');
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    function finish() { process.stdin.off('keypress', handler); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); }
    function handler(text, key) {
      if (key?.ctrl && key.name === 'c') { finish(); reject(new Error('Cancelado.')); }
      else if (key?.name === 'return') { finish(); resolve(value); }
      else if (key?.name === 'backspace') value = Array.from(value).slice(0, -1).join('');
      else if (text && !key?.ctrl && !key?.meta && !text.includes('\u001b')) value += text;
    }
    process.stdin.on('keypress', handler);
  });
}
try {
  const mode = process.argv[2];
  if (!['create', 'password'].includes(mode)) throw new Error('Usa pnpm admin:create ou pnpm admin:password.');
  console.log('Studio 601 — conta local. A password não aparece no ecrã.');
  const username = await question('Utilizador (ou e-mail): ');
  const first = await password('Password (mínimo 12 caracteres): ');
  const second = await password('Repetir password: ');
  if (first !== second) throw new Error('As passwords não coincidem.');
  await setAdministrator(username, first, mode === 'password');
  console.log(mode === 'create' ? 'Conta criada. Entra em /admin.' : 'Password alterada. As sessões anteriores foram terminadas.');
} catch (e) { console.error(e.message); process.exitCode = 1; }
