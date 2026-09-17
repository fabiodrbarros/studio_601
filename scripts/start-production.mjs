// Separate public HTTPS origin from the internal HTTP listener behind a proxy.
const value = process.env.APP_ORIGIN;
if (!value) throw new Error('APP_ORIGIN é obrigatório.');
const origin = new URL(value);
const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
if (value !== origin.origin || (origin.protocol !== 'https:' && !(loopback && origin.protocol === 'http:'))) {
  throw new Error('APP_ORIGIN deve ser uma origem HTTPS sem caminho, barra final ou credenciais (HTTP apenas em loopback para testes).');
}
process.env.HOSTNAME ||= '0.0.0.0';
process.env.PORT ||= '3000';
process.umask(0o077);
await import('../server.js');
