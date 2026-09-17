import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

test('Docker: standalone, HTTPS origin, authentication, uploads and volume persistence', { timeout: 900000 }, async () => {
  const project = 'studio601-test-' + randomBytes(5).toString('hex');
  const origin = 'https://studio601.fabiodrbarros.cloud';
  const base = 'http://127.0.0.1:30602';
  const env = { ...process.env, APP_ORIGIN: origin, PORT: '30602', BIND_ADDRESS: '127.0.0.1', IMAGE_TAG: 'local' };
  const temporary = mkdtempSync(join(tmpdir(), 'studio601-docker-'));
  let files = [];
  function compose(args, input) {
    const result = spawnSync('docker', ['compose', '-p', project, ...files, ...args], { env, input, encoding: 'utf8', timeout: 600000, maxBuffer: 10 * 1024 * 1024 });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    return result.stdout.trim();
  }
  async function healthy() {
    for (let i = 0; i < 90; i++) {
      const result = JSON.parse(compose(['ps', '--format', 'json']));
      if (result.Health === 'healthy') return;
      await delay(1000);
    }
    throw new Error(compose(['logs', '--tail', '60']));
  }
  let cookie;
  const request = (path, method = 'GET', body, authenticated = false, requestOrigin = origin) => fetch(base + path, {
    method, headers: { Origin: requestOrigin, ...(authenticated ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    compose(['up', '-d', '--build']);
    await healthy();
    assert.equal(compose(['exec', '-T', 'website', 'id', '-u']), '1000');
    assert.equal((await request('/')).status, 200);
    assert.equal((await request('/studio.css')).status, 200);
    assert.equal((await request('/studio.js')).status, 200);
    assert.match(await (await request('/admin')).text(), /Utilizador/);
    assert.equal((await request('/api/catalog?admin=1')).status, 403);
    const password = randomBytes(24).toString('base64url');
    // Secret sent over stdin, never in process arguments or saved to a file.
    compose(['exec', '-T', 'website', 'node', '--input-type=module', '-e',
      "let p='';for await(const c of process.stdin)p+=c;await (await import('./lib/local-auth.mjs')).setAdministrator('docker-test',p)"], password);
    assert.equal((await request('/api/auth/login', 'POST', { username: 'docker-test', password }, false, 'https://invalid.example')).status, 403);
    const login = await request('/api/auth/login', 'POST', { username: 'docker-test', password });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie'), /; Secure/);
    assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    cookie = login.headers.get('set-cookie').split(';')[0];
    assert.match(await (await request('/admin', 'GET', undefined, true)).text(), /Administração/);
    const current = await (await request('/api/catalog?admin=1', 'GET', undefined, true)).json();
    const data = current.data;
    data.contact.address = 'Docker persistence verification';
    assert.equal((await request('/api/catalog', 'PUT', { version: current.version, data }, true)).status, 200);
    const photo = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#88c501' } }).png().toBuffer();
    const upload = await fetch(base + '/api/media', { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'image/png' }, body: photo });
    assert.equal(upload.status, 201);
    const uploaded = await upload.json();
    const path = uploaded.url;
    assert.match(path, /^\/api\/media\//);
    const before = Buffer.from(await (await fetch(base + path)).arrayBuffer());
    assert.equal((await sharp(before).metadata()).format, 'webp');
    compose(['up', '-d', '--build', '--force-recreate']);
    await healthy();
    const persisted = await (await request('/api/catalog?admin=1', 'GET', undefined, true)).json();
    assert.equal(persisted.data.contact.address, data.contact.address);
    assert.deepEqual(Buffer.from(await (await fetch(base + path)).arrayBuffer()), before);
    // Same stopped-volume backup and fresh-volume restore procedure as DEPLOY.md.
    compose(['stop', 'website']);
    compose(['run', '--rm', '--no-deps', '--user', '0', '--cap-add', 'DAC_OVERRIDE', '--entrypoint', 'sh',
      '-v', `${temporary}:/backup`, 'website', '-ec', 'umask 077; tar -czf /backup/snapshot.tar.gz -C /data .; tar -tzf /backup/snapshot.tar.gz >/dev/null']);
    compose(['down']);
    const override = join(temporary, 'restore.json');
    writeFileSync(override, JSON.stringify({ volumes: { 'studio601-data': { name: project + '-restored' } } }));
    files = ['-f', 'compose.yaml', '-f', override];
    compose(['run', '--rm', '--no-deps', '--user', '0', '--cap-add', 'CHOWN', '--cap-add', 'FOWNER', '--cap-add', 'DAC_OVERRIDE', '--entrypoint', 'sh',
      '-v', `${temporary}:/backup:ro`, 'website', '-ec', 'test ! -e /data/studio601.sqlite; tar -xzf /backup/snapshot.tar.gz -C /data; chown -R 1000:1000 /data; chmod -R go-rwx /data']);
    compose(['up', '-d', '--build']);
    await healthy();
    assert.equal((await (await request('/api/catalog?admin=1', 'GET', undefined, true)).json()).data.contact.address, data.contact.address);
    assert.deepEqual(Buffer.from(await (await fetch(base + path)).arrayBuffer()), before);
    assert.equal(compose(['exec', '-T', 'website', 'node', '--input-type=module', '-e',
      'import {DatabaseSync} from "node:sqlite"; const db=new DatabaseSync(process.env.STUDIO_DB_PATH); console.log(Object.values(db.prepare("PRAGMA integrity_check").get())[0]); db.close()']), 'ok');
    assert.equal((await request('/api/auth/logout', 'POST', undefined, true)).status, 200);
    assert.equal((await request('/api/catalog?admin=1', 'GET', undefined, true)).status, 403);
    console.log('Verified non-root, healthcheck, public site, admin, HTTPS cookie, CSRF, persistence after container replacement, backup and restore into a fresh volume (SQLite integrity ok).');
  } finally {
    // Only this random test project and its synthetic data are removed.
    compose(['down', '--volumes', '--remove-orphans']);
    if (files.length) { files = []; compose(['down', '--volumes', '--remove-orphans']); }
    assert.ok(resolve(temporary).startsWith(resolve(tmpdir()) + sep) && temporary.includes('studio601-docker-'));
    rmSync(temporary, { recursive: true, force: true });
  }
});
