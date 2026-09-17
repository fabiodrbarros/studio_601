import {createRequire} from 'node:module';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {empty} from '../lib/catalog.ts';
const {chromium}=createRequire(import.meta.url)(process.env.STUDIO_PLAYWRIGHT_PATH||'playwright');
const directory=mkdtempSync(join(tmpdir(),'studio601-team-'));
process.env.STUDIO_DB_PATH=join(directory,'test.sqlite');
const {database,writeStoredCatalog}=await import('../lib/local-db.mjs');
const {setAdministrator}=await import('../lib/local-auth.mjs');
const password=randomBytes(24).toString('base64url');await setAdministrator('teste-equipa',password);
const member={id:randomUUID(),name:'Pessoa de teste',role:'',bio:'',areas:['dance'],published:true};
const other={...member,id:randomUUID(),name:'Outra pessoa'};
const modalities=[['fitness','PT'],['wellness','Pilates de Aparelhos'],['dance','Aula de teste']].map(([area,name])=>({id:randomUUID(),area,name,kind:area==='fitness'?'pt':area==='wellness'?'service':'group',mode:area==='dance'?'schedule':'appointment',description:'',published:true,professionalIds:area==='dance'?[other.id]:[]}));
const sessions=[{id:randomUUID(),modalityId:modalities[2].id,professionalId:member.id,room:'',recurrence:'weekly',weekday:1,date:'',startDate:'',endDate:'',time:'18:00',duration:null,cancelledDates:[],published:true}];
const original={...empty,modalities,professionals:[member,other],sessions};
writeStoredCatalog(0,JSON.stringify(original));
const origin='http://127.0.0.1:30606';let server,browser,output='';
async function start(){server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','30606'],{env:{...process.env,APP_ORIGIN:origin},stdio:['ignore','pipe','pipe']});server.stdout.on('data',c=>output+=c);server.stderr.on('data',c=>output+=c);for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error(output);try{if((await fetch(origin+'/api/catalog')).ok)return;}catch{}await delay(250);}throw Error(output);}
async function stop(){if(server&&server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped;}}
try{
 await start();browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/admin');await page.getByLabel('Utilizador',{exact:true}).fill('teste-equipa');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 const navigation=page.getByRole('navigation',{name:'Gestão do Studio'});
 await navigation.waitFor();
 assert.deepEqual(await navigation.getByRole('button').allTextContents(),['EQUIPA','CONTACTOS','FITNESS','WELLNESS','DANCE']);
 await navigation.getByRole('button',{name:'EQUIPA',exact:true}).click();
 assert.equal(await navigation.getByRole('button',{name:'EQUIPA',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await page.getByRole('tab',{name:'Equipa',exact:true}).count(),0);
 assert.equal(await page.getByRole('tab',{name:'Modalidades e serviços',exact:true}).count(),0);
 for(const area of ['FITNESS','WELLNESS','DANCE']){
  await navigation.getByRole('button',{name:area,exact:true}).click();
  assert.equal(await navigation.getByRole('button',{name:area,exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByRole('tab',{name:'Modalidades e serviços',exact:true}).count(),1);
  assert.equal(await page.getByRole('tab',{name:'Equipa',exact:true}).count(),0);
  await navigation.getByRole('button',{name:'EQUIPA',exact:true}).click();
 }
 assert.equal(await page.locator('.divide-y>div').count(),2);
 assert.equal(await page.getByRole('tab',{name:'Equipa e PTs',exact:true}).count(),0);
 const row=()=>page.locator('.divide-y>div').filter({has:page.getByText('Pessoa de teste',{exact:true})});
 await row().getByRole('button',{name:'Editar',exact:true}).click();const dialog=page.getByRole('dialog');
 assert.equal(await dialog.getByRole('switch',{name:'DANCE',exact:true}).isDisabled(),true);
 await dialog.getByRole('switch',{name:'FITNESS',exact:true}).check();await dialog.getByRole('switch',{name:'WELLNESS',exact:true}).check();
 assert.equal(await dialog.getByRole('checkbox').count(),0);
 await dialog.getByRole('button',{name:'Guardar',exact:true}).click();await dialog.waitFor({state:'hidden'});
 let saved=(await(await page.request.get(origin+'/api/catalog?admin=1')).json()).data;
 assert.equal(saved.professionals.length,2);assert.deepEqual(saved.sessions,original.sessions);assert.deepEqual(saved.modalities,original.modalities);
 assert.deepEqual(new Set(saved.professionals[0].areas),new Set(['fitness','wellness','dance']));
 await page.screenshot({path:'outputs/team-admin-desktop.png',fullPage:true});
 await row().getByRole('button',{name:'Editar',exact:true}).click();
 assert.equal(await dialog.getByRole('checkbox').count(),0);
 for(const name of ['FITNESS','WELLNESS','DANCE'])assert.equal(await dialog.getByRole('switch',{name,exact:true}).isChecked(),true);
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>getComputedStyle(document.querySelector('nav[aria-label="Gestão do Studio"] button')).fontSize==='11px');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'outputs/team-admin-mobile.png',fullPage:true});
 await dialog.getByRole('button',{name:'Guardar',exact:true}).click();await dialog.waitFor({state:'hidden'});
 assert.deepEqual((await(await page.request.get(origin+'/api/catalog?admin=1')).json()).data,saved);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert(await navigation.evaluate(nav=>nav.getBoundingClientRect().right<=innerWidth));
 await page.goto(origin);await page.waitForFunction(()=>document.querySelector('.team-track').textContent.includes('Pessoa de teste'));
 assert.equal(await page.locator('.team-track article').filter({hasText:'Pessoa de teste'}).count(),1);
 for(const area of ['fitness','wellness','dance']){await page.locator(`[data-select="${area}"]`).click();assert.equal(await page.locator('.team-track article').filter({hasText:'Pessoa de teste'}).count(),1);}
 await page.goto(origin+'/admin');await page.getByRole('button',{name:'EQUIPA',exact:true}).click();await row().getByRole('button',{name:'Editar',exact:true}).click();
 await dialog.getByRole('switch',{name:'WELLNESS',exact:true}).uncheck();await dialog.getByRole('button',{name:'Guardar',exact:true}).click();await dialog.waitFor({state:'hidden'});
 saved=(await(await page.request.get(origin+'/api/catalog?admin=1')).json()).data;
 assert.deepEqual(saved.modalities,original.modalities);assert.equal(saved.professionals[0].areas.includes('wellness'),false);assert.deepEqual(saved.sessions,original.sessions);
 await stop();await start();assert.deepEqual((await(await page.request.get(origin+'/api/catalog?admin=1')).json()).data,saved);
 await page.goto(origin+'/admin');await page.getByRole('button',{name:'CONTACTOS',exact:true}).click();await page.getByRole('heading',{name:'Contactos do Studio',exact:true}).waitFor();assert.equal(await page.getByRole('tab').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'outputs/contacts-global-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Equipa: gestão global, seleção apenas de áreas, pessoa nas três áreas, edição sem duplicar, serviços e sessões preservados, mobile e persistência após reinício verificados.');
}finally{if(browser)await browser.close();await stop();database().close();assert(resolve(directory).startsWith(resolve(tmpdir())+sep)&&directory.includes('studio601-team-'));rmSync(directory,{recursive:true,force:true});}
