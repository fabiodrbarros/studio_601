import { createRequire } from 'node:module';
import { randomBytes,randomUUID } from 'node:crypto';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve,sep } from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { importFitness } from '../lib/fitness-import.mjs';
import { empty } from '../lib/catalog.ts';

const {chromium}=createRequire(import.meta.url)(process.env.STUDIO_PLAYWRIGHT_PATH||'playwright');

// Isolated catalog and random test credentials; never modifies the user's admin or catalog.
const directory=mkdtempSync(join(tmpdir(),'studio601-fitness-'));
process.env.STUDIO_DB_PATH=join(directory,'test.sqlite');
const {database,writeStoredCatalog}=await import('../lib/local-db.mjs');
const {setAdministrator}=await import('../lib/local-auth.mjs');
const password=randomBytes(24).toString('base64url');await setAdministrator('teste-fitness',password);
const {data}=importFitness(empty);
for(const area of ['dance','wellness'])data.modalities.push({id:randomUUID(),name:'Preservado '+area,area,kind:'service',mode:'appointment',description:'',published:true});
writeStoredCatalog(0,JSON.stringify(data));
const origin='http://127.0.0.1:30602';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','30602'],{env:{...process.env,APP_ORIGIN:origin},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<120;i++){try{if((await fetch(origin+'/api/catalog')).ok)break;}catch{}await delay(250);}
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',timezoneId:'America/Los_Angeles'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.locator('[data-select="fitness"]').click();
 await page.waitForFunction(()=>document.querySelectorAll('.timetable-event').length===26);
 assert.equal(await page.locator('.series-card').count(),17);
 assert.match(await page.locator('.timetable-event').filter({hasText:'Pilates'}).textContent(),/18:00–18:50/);
 assert.equal(await page.locator('.timetable-event').filter({hasText:'Personal Training'}).count(),0);
 const service=page.locator('.series-card').filter({has:page.locator('.series-title',{hasText:'Personal Training'})});
 assert.equal(await service.getByRole('link',{name:'Contactar para informações'}).getAttribute('href'),'#contactos');
 for(const area of ['dance','wellness']){await page.locator('[data-select="'+area+'"]').click();assert.equal(await page.locator('.series-card').count(),1);assert(!await page.locator('#series-stack').textContent().then(t=>t.includes('Pilates')));}
 await page.locator('[data-select="all"]').click();assert.equal(await page.locator('#horarios').isVisible(),false);
 await page.goto(origin+'/admin');await page.getByLabel('Utilizador',{exact:true}).fill('teste-fitness');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('heading',{name:'Administração'}).waitFor();
 await page.getByRole('tab',{name:'Turmas e sessões'}).click();
 const row=page.locator('[data-schedule-modality]').filter({has:page.getByRole('heading',{name:'Pilates',exact:true})});await row.getByRole('button',{name:'Editar',exact:true}).click();
 const dialog=page.getByRole('dialog');assert.match(await dialog.textContent(),/Por atribuir/);
 assert.equal(await dialog.getByLabel('Sala / local (opcional)').inputValue(),'');
 await dialog.getByLabel('Hora de início').fill('18:05');await dialog.getByRole('button',{name:'Guardar',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await page.goto(origin);await page.locator('[data-select="fitness"]').click();await page.waitForFunction(()=>document.querySelector('#timetable-body').textContent.includes('18:05–18:55'));
 assert(!/null|undefined/.test(await page.locator('#timetable-body').textContent()));
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.timetable-event').count(),26);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('Fitness: 17 cartões, 26 sessões, Pilates, serviços sem sessões, isolamento das áreas, edição admin→site e mobile sem erros.');
}finally{
 if(browser)await browser.close();const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped;database().close();
 assert(resolve(directory).startsWith(resolve(tmpdir())+sep)&&directory.includes('studio601-fitness-'));rmSync(directory,{recursive:true,force:true});
}
