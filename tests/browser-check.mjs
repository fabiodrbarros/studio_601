import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Opcional: caminho para uma instalação existente de Playwright; sem alterar o lockfile.
export async function browserCheck(origin, password, data) {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const errors = [];
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await desktop.newPage();
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(origin);
    await page.waitForFunction(() => document.querySelector('.contact-details').textContent.includes('Teste local'));
    for (const [label, field] of [['Instagram','instagramUrl'], ['Facebook','facebookUrl']]) {
      const link = page.locator('.contact-details').getByRole('link', {name:label, exact:true});
      assert.equal(await link.getAttribute('href'), data.contact[field]);
      assert.equal(await link.getAttribute('target'), '_blank');
      assert.equal(await link.getAttribute('rel'), 'noopener noreferrer');
    }
    for (const [area, title] of [['fitness','FITNESS'], ['wellness','WELLNESS'], ['dance','DANCE'], ['all','STUDIO 601']]) {
      await page.locator(`[data-select="${area}"]`).click();
      assert.equal(await page.locator('body').getAttribute('data-area'), area);
      assert.ok((await page.locator('#hero-title').textContent()).includes(title));
      assert.equal(await page.locator('#horarios').isVisible(), area !== 'all');
      if (area === 'wellness') {
        assert.equal(await page.locator('.timetable-wrap').isVisible(), false);
        assert.match(await page.locator('#schedule-empty').textContent(), /Pedir marcação/);
      }
      if (area === 'dance') assert.equal(await page.locator('.timetable thead th').count(), 1);
    }
    await page.locator('[data-select="fitness"]').click();
    assert.match(await page.locator('#timetable-body').textContent(), /Teste Fitness/);
    await page.locator('#week-next').click();
    assert.ok(!(await page.locator('#timetable-body').textContent()).includes('Teste Fitness') || !await page.locator('.timetable-wrap').isVisible());
    await page.locator('#week-prev').click();
    assert.equal(await page.locator('.menu-trigger').count(), 0);
    assert.equal(await page.locator('#menu').count(), 0);
    await page.locator('.series-detail').first().click();
    assert.equal(await page.locator('#detail').isVisible(), true);
    await page.getByRole('button', { name: 'Fechar detalhe' }).click();
    await page.goto(origin + '/admin');
    await page.getByLabel('Utilizador', { exact: true }).fill('teste-local');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('heading', { name: 'Administração' }).waitFor();
    await page.getByRole('button', { name: 'Adicionar modalidade', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Adicionar modalidade', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome', { exact: true }).fill('Modalidade criada no browser');
    await dialog.getByLabel('Descrição', { exact: true }).fill('Verificação de criação e edição.');
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    const row = page.locator('.divide-y > div').filter({ hasText: 'Modalidade criada no browser' });
    assert.match(await row.textContent(), /Rascunho/);
    await row.getByRole('button', { name: 'Editar', exact: true }).click();
    await dialog.getByRole('switch').click();
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.match(await row.textContent(), /Publicado/);
    await row.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('alertdialog').waitFor({ state: 'hidden' });
    assert.equal(await row.count(), 0);
    await page.getByRole('button', { name: 'EQUIPA', exact: true }).click();
    assert.match(await page.locator('.divide-y').textContent(), /Profissional de teste/);
    await page.getByRole('button', { name: 'Adicionar membro da equipa', exact: true }).click();
    await dialog.getByLabel('Nome', { exact: true }).fill('Profissional criado no browser');
    await dialog.getByLabel('Função / especialidade', { exact: false }).fill('Profissional multiarea');
    await dialog.getByLabel('Apresentação', { exact: true }).fill('Teste de equipa.');
    for (const name of ['FITNESS', 'WELLNESS', 'DANCE']) await dialog.getByRole('switch', { name, exact: true }).check();
    await dialog.getByRole('switch', { name: 'Publicado no site', exact: true }).check();
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    const professionalRow = page.locator('.divide-y > div').filter({ hasText: 'Profissional criado no browser' });
    assert.match(await professionalRow.textContent(), /FITNESS \/ WELLNESS \/ DANCE/);
    await page.getByRole('button', { name: 'FITNESS', exact: true }).click();
    await page.getByRole('tab', { name: 'Turmas e sessões', exact: true }).click();
    await page.locator('[data-schedule-session]').getByRole('button', { name: 'Editar', exact: true }).click();
    assert.equal(await dialog.getByLabel('Datas sem aula', { exact: false }).inputValue(), data.sessions[0].cancelledDates.join('\n'));
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    const choose = async (index, name) => {
      await dialog.getByRole('combobox').nth(index).click();
      await page.getByRole('option', { name, exact: true }).click();
    };
    for (const recurrence of ['weekly', 'once']) {
      await page.getByRole('button', { name: 'Adicionar sessão', exact: true }).click();
      await choose(0, 'Teste Fitness');
      await choose(1, 'Profissional criado no browser');
      await dialog.getByLabel('Sala / local (opcional)', { exact: true }).fill('Sala browser ' + recurrence);
      if (recurrence === 'once') {
        await choose(2, 'Data específica');
        await dialog.getByLabel('Data', { exact: true }).fill(data.sessions[1].date);
      } else {
        await choose(3, 'Terça');
        await dialog.getByLabel('Desde (opcional)', { exact: true }).fill(data.sessions[1].date.slice(0, 4) + '-01-01');
        await dialog.getByLabel('Até (opcional)', { exact: true }).fill(data.sessions[1].date.slice(0, 4) + '-12-31');
        await dialog.getByLabel('Datas sem aula', { exact: false }).fill(data.sessions[0].cancelledDates.join('\n'));
      }
      await dialog.getByLabel('Hora de início', { exact: true }).fill('10:30');
      await dialog.getByLabel('Duração (minutos)', { exact: true }).fill('45');
      await dialog.getByRole('switch').click();
      await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      const sessionRow = page.locator('[data-schedule-session]').filter({ hasText: 'Sala browser ' + recurrence });
      assert.match(await sessionRow.textContent(), /Publicado/);
      await sessionRow.getByRole('button', { name: 'Editar', exact: true }).click();
      if (recurrence === 'weekly') assert.equal(await dialog.getByLabel('Datas sem aula', { exact: false }).inputValue(), data.sessions[0].cancelledDates.join('\n'));
      else assert.equal(await dialog.getByLabel('Data', { exact: true }).inputValue(), data.sessions[1].date);
      await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await sessionRow.getByRole('button', { name: 'Eliminar', exact: true }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
      await page.getByRole('alertdialog').waitFor({ state: 'hidden' });
    }
    await page.getByRole('button', { name: 'EQUIPA', exact: true }).click();
    await professionalRow.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('alertdialog').waitFor({ state: 'hidden' });
    await page.getByRole('tab', { name: 'Turmas e sessões', exact: true }).click();
    await page.getByRole('button', { name: 'WELLNESS', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Adicionar sessão', exact: true }).count(), 0);
    await page.getByRole('tab', { name: 'Contactos', exact: true }).click();
    await page.getByLabel('Morada', { exact: true }).fill('Contacto guardado no browser');
    await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/catalog') && r.request().method() === 'PUT' && r.status() === 200),
      page.getByRole('button', { name: 'Guardar contactos', exact: true }).click()]);
    await page.reload();
    await page.getByRole('tab', { name: 'Contactos', exact: true }).click();
    assert.equal(await page.getByLabel('Morada', { exact: true }).inputValue(), 'Contacto guardado no browser');
    assert.equal(await page.getByLabel('Link do Instagram', { exact: true }).inputValue(), data.contact.instagramUrl);
    assert.equal(await page.getByLabel('Link do Facebook', { exact: true }).inputValue(), data.contact.facebookUrl);
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).waitFor();
    for (const width of [390, 768]) {
      const mobile = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
      const smallPage = await mobile.newPage();
      smallPage.on('pageerror', error => errors.push(error.message));
      await smallPage.goto(origin);
      await smallPage.waitForFunction(() => document.querySelector('.contact-details').textContent.includes('Contacto guardado no browser'));
      for (const area of ['all', 'fitness', 'wellness', 'dance']) {
        await smallPage.locator(`[data-select="${area}"]`).click();
        assert.equal(await smallPage.locator('body').getAttribute('data-area'), area);
        assert.ok(await smallPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow em ${width}px/${area}`);
      }
      await smallPage.goto(origin + '/admin');
      assert.ok(await smallPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await smallPage.getByLabel('Utilizador', { exact: true }).fill('teste-local');
      await smallPage.getByLabel('Password', { exact: true }).fill(password);
      await smallPage.getByRole('button', { name: 'Entrar', exact: true }).click();
      await smallPage.getByRole('heading', { name: 'Administração' }).waitFor();
      await smallPage.getByRole('button', { name: 'Adicionar modalidade', exact: true }).waitFor();
      assert.ok(await smallPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow do admin em ${width}px`);
      await smallPage.getByRole('button', { name: 'Sair', exact: true }).click();
      await smallPage.getByLabel('Password', { exact: true }).waitFor();
      await mobile.close();
    }
    assert.deepEqual(errors, []);
    console.log('Browser Edge: quatro vistas, detalhe, horários/cancelamentos, login/logout, criar/editar/publicar/eliminar, contactos e navegação em 1440/768/390px sem erros JavaScript.');
  } finally { await browser.close(); }
}
