import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.STUDIO_PLAYWRIGHT_PATH||'C:/Users/Fabio/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],writes=[];
async function open(width,reducedMotion='no-preference',abort=false){
 const context=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion});
 await context.addInitScript(()=>{window.motionEvents=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){window.motionEvents.push({section:this.closest('section')?.id||(this.closest('footer')?'footer':''),area:document.body.dataset.area,id:this.id,className:this.className,duration:options.duration});return animate.call(this,frames,options)}});
 if(abort)await context.route('**/studio-motion.mjs',r=>r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/')&&!['GET','HEAD'].includes(r.method()))writes.push(r.method()+' '+r.url())});
 await page.goto(base);await page.waitForFunction(()=>document.querySelectorAll('.team-portrait').length>0);await page.waitForTimeout(100);
 return {page,context};
}
async function scroll(page,selector){await page.locator(selector).first().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(130)}
async function settled(page){await page.waitForTimeout(850);await page.waitForFunction(()=>document.getAnimations().filter(a=>a.constructor.name==='Animation').length===0,{},{timeout:6000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.constructor.name==='Animation').length),0)}
try{
 for(const width of [1440,390,320]){
  const {page,context}=await open(width);
  await scroll(page,'#areas h2');await scroll(page,'.area-card');await scroll(page,'#equipa h2');await scroll(page,'.team-portrait');await scroll(page,'#contactos h2');await scroll(page,'.contact-details');await scroll(page,'.map-placeholder');await scroll(page,'footer');await settled(page);
  for(const area of ['fitness','wellness','dance']){
   await page.locator('[data-select="'+area+'"]').click();await page.waitForFunction(a=>document.body.dataset.area===a,area);await settled(page);
   await scroll(page,'#studio h2');await scroll(page,'.studio-visual');await scroll(page,'#aulas h2');await scroll(page,'.series-card');await scroll(page,'#equipa h2');await scroll(page,'.team-portrait');await settled(page);
   if(area==='wellness')assert(await page.locator('#horarios').isHidden());
   else{
    await scroll(page,'#horarios h2');const days=page.locator('#timetable-days button');const count=await days.count();assert(count>0);
    for(let i=0;i<count;i++){await days.nth(i).click();assert.equal(await days.nth(i).getAttribute('aria-pressed'),'true')}
    if(await page.locator('.daily-lesson').count()){await scroll(page,'.daily-lesson');await page.locator('.daily-lesson summary').first().click();assert(await page.locator('.daily-lesson').first().evaluate(e=>e.open))}
    await page.locator('#week-next').click();await page.locator('#week-prev').click();await settled(page);
   }
   await scroll(page,'#contactos h2');await scroll(page,'.map-placeholder');await scroll(page,'footer');await settled(page);
  }
  const events=await page.evaluate(()=>motionEvents);for(const section of ['inicio','studio','areas','aulas','equipa','horarios','contactos','footer'])assert(events.some(e=>e.section===section),'no motion for '+section+' at '+width);
  assert(events.some(e=>e.className==='daily-lesson'));assert(events.every(e=>e.duration<=1440));
  await page.locator('[data-select="fitness"]').click();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.constructor.name==='Animation').length),0);
  const length=await page.evaluate(()=>motionEvents.length);await page.locator('[data-select="dance"]').click();await scroll(page,'#aulas h2');await scroll(page,'#horarios h2');assert.equal(await page.evaluate(()=>motionEvents.length),length);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-select="fitness"]').click();await page.locator('[data-select="wellness"]').click();await page.locator('[data-select="all"]').click();await settled(page);assert(await page.locator('.hero-brand').isVisible());assert(await page.locator('#areas').isVisible());
  if(width===1440||width===390){await scroll(page,'.area-card');await settled(page);await page.screenshot({path:'outputs/site-motion-'+width+'.png'})}
  console.log('PASS sections, areas, days, weeks, reduced motion, interruption, width '+width+' ('+events.length+' entrances)');await context.close();
 }
 for(const abort of [false,true]){
  const {page,context}=await open(390,'reduce',abort);await scroll(page,'#areas h2');await scroll(page,'.team-portrait');await scroll(page,'#contactos h2');assert.equal(await page.evaluate(()=>motionEvents.length),0);assert(await page.locator('.hero-brand').evaluate(e=>getComputedStyle(e).opacity==='1'));await page.locator('[data-select="fitness"]').click();assert(await page.locator('.series-card').count()>0);await settled(page);console.log('PASS visible content '+(abort?'without animation module':'with reduced motion'));await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log('PASS no browser errors and no API writes');
}finally{await browser.close()}
