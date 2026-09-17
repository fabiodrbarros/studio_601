import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

test('Execução local: autenticação, catálogo, validações, concorrência e reinício', { timeout: 180000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), 'studio601-test-'));
  const path = join(directory, 'test.sqlite');
  process.env.STUDIO_DB_PATH = path;
  const { database } = await import('../lib/local-db.mjs');
  const { setAdministrator, sessionAdministrator } = await import('../lib/local-auth.mjs');
  const password = randomBytes(24).toString('base64url');
  await setAdministrator('teste-local', password);
  const origin = 'http://127.0.0.1:30601';
  let server, output = '';
  async function start() {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '30601'], {
      env: { ...process.env, APP_ORIGIN: origin, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.on('data', chunk => { output += chunk; });
    server.stderr.on('data', chunk => { output += chunk; });
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw Error(output);
      try { if ((await fetch(origin + '/api/catalog')).ok) return; } catch {}
      await delay(250);
    }
    throw Error('Servidor não iniciou: ' + output);
  }
  async function stop() {
    if (!server || server.exitCode !== null) return;
    const stopped = new Promise(resolve => server.once('exit', resolve));
    server.kill(); await stopped;
  }
  const api = (route, method = 'GET', body, cookie, requestOrigin = origin, extra = {}) => fetch(origin + route, {
    method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' && requestOrigin ? { Origin: requestOrigin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...extra },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const login = (pass = password, requestOrigin = origin) => api('/api/auth/login', 'POST', { username: 'teste-local', password: pass }, undefined, requestOrigin);
  try {
    await start();
    assert.equal((await api('/')).status, 200);
    assert.equal((await api('/studio.css')).status, 200);
    assert.equal((await api('/studio.js')).status, 200);
    assert.match(await (await api('/admin')).text(), /Utilizador/);
    assert.equal((await api('/api/catalog?admin=1')).status, 403);
    assert.equal((await api('/api/catalog?admin=1', 'GET', undefined, undefined, origin, {
      'oai-authenticated-user-id': 'fake', 'oai-authenticated-user-email': 'admin@example.com', 'x-forwarded-user': 'admin',
    })).status, 403);
    assert.equal((await api('/api/catalog?admin=1', 'GET', undefined, 'studio601_admin=' + randomBytes(32).toString('base64url'))).status, 403);
    assert.equal((await login(password, 'https://untrusted.example')).status, 403);
    assert.equal((await login(password, null)).status, 403);
    assert.equal((await login(randomBytes(20).toString('hex'))).status, 401);
    const logged = await login();
    assert.equal(logged.status, 200);
    const setCookie = logged.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/);
    const cookie = setCookie.split(';')[0];
    assert.equal((await api('/api/catalog?admin=1', 'GET', undefined, cookie)).status, 200);
    assert.match(await (await api('/admin', 'GET', undefined, cookie)).text(), /Administração/);
    const fit = randomUUID(), well = randomUUID(), dance = randomUUID(), draft = randomUUID(), pro = randomUUID();
    const monday = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' }) + 'T12:00:00Z');
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    const weekDate = offset => { const d = new Date(monday); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
    const data = {
      modalities: [
        { id: fit, name: 'Teste Fitness', area: 'fitness', kind: 'group', mode: 'schedule', description: 'Teste local', published: true },
        { id: well, name: 'Teste Wellness', area: 'wellness', kind: 'service', mode: 'appointment', description: '', published: true },
        { id: dance, name: 'Teste Dance', area: 'dance', kind: 'group', mode: 'schedule', description: '', published: true },
        { id: draft, name: 'Rascunho', area: 'fitness', kind: 'pt', mode: 'appointment', description: '', published: false },
      ],
      professionals: [{ id: pro, name: 'Profissional de teste', role: 'Teste', bio: '', areas: ['fitness', 'wellness', 'dance'], published: true }],
      sessions: [
        { id: randomUUID(), modalityId: fit, professionalId: pro, room: 'Sala teste', recurrence: 'weekly', weekday: 1, date: '', startDate: '', endDate: '', time: '18:00', duration: 60, cancelledDates: [weekDate(7), weekDate(14)], published: true },
        { id: randomUUID(), modalityId: dance, professionalId: pro, room: 'Sala teste', recurrence: 'once', weekday: 0, date: weekDate(2), startDate: '', endDate: '', time: '19:00', duration: 45, cancelledDates: [], published: true },
      ], contact: { email: 'teste@example.com', phone: '', address: 'Teste local', phoneNote: 'Indicação de teste', mapUrl: 'https://www.google.com/maps?cid=9423403120071143153', instagramUrl: 'https://www.instagram.com/studio_601/', facebookUrl: 'https://www.facebook.com/studio601/?locale=pt_PT' },
    };
    assert.equal((await api('/api/catalog', 'PUT', { version: 0, data })).status, 403);
    assert.equal((await api('/api/catalog', 'PUT', { version: 0, data }, cookie, 'https://untrusted.example')).status, 403);
    assert.equal((await api('/api/catalog', 'PUT', { version: 0, data }, cookie, null)).status, 403);
    assert.equal((await api('/api/catalog', 'PUT', null, cookie)).status, 400);
    assert.equal((await api('/api/catalog', 'PUT', { version: 0, data }, cookie)).status, 200);
    let publicData = (await (await api('/api/catalog')).json()).data;
    assert.equal(publicData.modalities.length, 3); assert.equal(publicData.sessions.length, 2);
    const badWellness = structuredClone(data); badWellness.modalities[1].mode = 'schedule';
    assert.equal((await api('/api/catalog', 'PUT', { version: 1, data: badWellness }, cookie)).status, 400);
    const badMap = structuredClone(data); badMap.contact.mapUrl = 'javascript:alert(1)';
    assert.equal((await api('/api/catalog', 'PUT', { version: 1, data: badMap }, cookie)).status, 400);
    badMap.contact.mapUrl = 'https://untrusted.example/maps';
    assert.equal((await api('/api/catalog', 'PUT', { version: 1, data: badMap }, cookie)).status, 400);
    for (const [field, url] of [['instagramUrl', 'javascript:alert(1)'], ['facebookUrl', 'https://facebook.com.untrusted.example/studio601/']]) {
      const badSocial = structuredClone(data); badSocial.contact[field] = url;
      assert.equal((await api('/api/catalog', 'PUT', { version: 1, data: badSocial }, cookie)).status, 400);
    }
    const badProfessional = structuredClone(data); badProfessional.professionals[0].areas = ['wellness'];
    assert.equal((await api('/api/catalog', 'PUT', { version: 1, data: badProfessional }, cookie)).status, 400);
    const badDate = structuredClone(data); badDate.sessions[1].date = '2026-02-30';
    assert.equal((await api('/api/catalog', 'PUT', { version: 1, data: badDate }, cookie)).status, 400);
    const concurrent = await Promise.all([api('/api/catalog', 'PUT', { version: 1, data }, cookie), api('/api/catalog', 'PUT', { version: 1, data }, cookie)]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
    const hidden = structuredClone(data); hidden.professionals[0].published = false;
    assert.equal((await api('/api/catalog', 'PUT', { version: 2, data: hidden }, cookie)).status, 200);
    publicData = (await (await api('/api/catalog')).json()).data;
    assert.equal(publicData.sessions.length, 0); assert.equal(publicData.professionals.length, 0);
    assert.equal((await api('/api/catalog', 'PUT', { version: 3, data }, cookie)).status, 200);
    if (process.env.STUDIO_PLAYWRIGHT_PATH) {
      const { browserCheck } = await import('./browser-check.mjs');
      await browserCheck(origin, password, data);
      const latest = await (await api('/api/catalog?admin=1', 'GET', undefined, cookie)).json();
      // Repor o catálogo de teste depois dos exercícios de CRUD no browser.
      assert.equal((await api('/api/catalog', 'PUT', { version: latest.version, data }, cookie)).status, 200);
    }
    const expected = await (await api('/api/catalog?admin=1', 'GET', undefined, cookie)).json();
    await stop(); await start();
    const persisted = await (await api('/api/catalog?admin=1', 'GET', undefined, cookie)).json();
    assert.equal(persisted.version, expected.version); assert.deepEqual(persisted.data, data);
    assert.equal((await login()).status, 200);
    assert.equal((await api('/api/auth/logout', 'POST', undefined, cookie, 'https://untrusted.example')).status, 403);
    assert.equal((await api('/api/auth/logout', 'POST', undefined, cookie)).status, 200);
    assert.equal((await api('/api/catalog?admin=1', 'GET', undefined, cookie)).status, 403);
    const freshCookie = (await login()).headers.get('set-cookie').split(';')[0];
    database().prepare('UPDATE admin_sessions SET expires_at=0').run();
    assert.equal((await api('/api/catalog?admin=1', 'GET', undefined, freshCookie)).status, 403);
    const resetCookie = (await login()).headers.get('set-cookie').split(';')[0];
    await setAdministrator('teste-local', password, true);
    assert.equal(sessionAdministrator(resetCookie.split('=')[1]), null);
    for (let i = 0; i < 5; i++) assert.equal((await login(randomBytes(20).toString('hex'))).status, 401);
    await stop(); await start();
    assert.equal((await login()).status, 429);
    assert.equal((await api('/api/auth/login', 'POST', { username: 'teste-local', password }, undefined, origin, { 'x-forwarded-for': '203.0.113.1' })).status, 429);
    const row = database().prepare('SELECT password_hash FROM administrators').get();
    assert.match(row.password_hash, /^scrypt:/); assert.ok(!row.password_hash.includes(password));
    console.log('Verificados: login, autorização, CSRF, rascunhos/publicação, Wellness, sessões, cancelamentos, concorrência, logout, expiração, reset e persistência após dois reinícios.');
  } finally {
    await stop(); database().close();
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep) && directory.includes('studio601-test-'));
    rmSync(directory, { recursive: true, force: true });
  }
});
