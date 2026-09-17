import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [command, ...args] = process.argv.slice(2);
if (!['dev', 'build', 'start'].includes(command)) throw new Error('Comando inválido.');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 24 || (major === 24 && minor < 14)) throw new Error('Instala Node.js 24.14 ou superior.');
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
try { process.loadEnvFile('.env.local'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const origin = new URL(process.env.APP_ORIGIN || 'http://127.0.0.1:3000');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || origin.protocol !== 'http:') {
  throw new Error('Nesta fase o arranque está limitado a HTTP local. Usa APP_ORIGIN=http://127.0.0.1:3000.');
}
const cli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const child = spawn(process.execPath, [cli, command,
  ...(command === 'build' ? ['--webpack'] : ['--hostname', origin.hostname, '--port', origin.port || '80', ...(command === 'dev' ? ['--webpack'] : [])]),
  ...args], { cwd: root, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
child.on('error', e => { console.error(e.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
