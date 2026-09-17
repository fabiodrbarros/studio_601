const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
let catalog={modalities:[],professionals:[],sessions:[],contact:{}},area='all',week=0,loading=true,failed=false;
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)'),teamTrack=$('#team-track');
let reduce=motionPreference.matches,siteMotion;
motionPreference.addEventListener('change',event=>{reduce=event.matches});
const cardTemplate=$('.series-card').cloneNode(true),personTemplate=$('.team-portrait').cloneNode(true);
const headings={all:['STUDIO 601.','FITNESS / WELLNESS / DANCE'],fitness:['FITNESS.','01 — 03'],wellness:['WELLNESS.','02 — 03'],dance:['DANCE.','03 — 03']};
function empty(el,msg){el.replaceChildren();const p=document.createElement('p');p.className='catalog-empty';p.textContent=msg;el.append(p)}
function detail(title,description){$('#detail-title').textContent=title;$('#detail-label').textContent=area==='all'?'STUDIO 601':area.toUpperCase();$('#detail>p').textContent=description||'Mais informações disponíveis junto do Studio.';$('#detail').showModal()}
const introductions={
 all:{title:'TRÊS ÁREAS. UM STUDIO.',text:'No Studio 601, podes treinar, dançar e cuidar de ti. Desde aulas de fitness e dança a sessões de Pilates e treino personalizado, temos opções para várias idades, em grupo ou com acompanhamento individual. Vem visitar-nos, teremos gosto em receber-te.'},
 fitness:{title:'O TEU TREINO. O TEU RITMO.',text:'Ganha força, supera-te e sente a diferença no teu dia a dia. Seja em grupo ou com treino personalizado, estamos contigo em cada treino.'},
 wellness:{title:'UM TEMPO PARA TI.',text:'Reserva um tempo para ti. Move-te com mais confiança, cuida do teu corpo e encontra no Pilates um momento só teu.'},
 dance:{title:'ESPAÇO PARA DANÇAR.',text:'Sente a música, solta o movimento e ganha confiança para te expressares. Quer estejas a começar ou queiras ir mais longe, vem dançar connosco.'}
};
let heroScheduleCalculator,heroScheduleSignature='';
const studioOverviewIntro=document.createElement('p');
studioOverviewIntro.className='studio-overview-intro text-label';studioOverviewIntro.textContent=introductions.all.text;
$('#areas .heading-aside>span.text-label')?.remove();
$('#areas .copy-placeholder').replaceWith(studioOverviewIntro);
const heroSchedule=document.createElement('div');
heroSchedule.className='hero-schedule';heroSchedule.hidden=true;
heroSchedule.setAttribute('role','status');heroSchedule.setAttribute('aria-live','polite');
$('.hero .copy-placeholder').replaceWith(heroSchedule);
import('/hero-schedule.mjs').then(module=>{heroScheduleCalculator=module.getHeroSchedule;renderHeroSchedule()}).catch(()=>{heroSchedule.hidden=true});
function renderHeroSchedule(){
 if(!heroScheduleCalculator||loading||failed||area==='wellness'){heroSchedule.hidden=true;heroScheduleSignature='';return;}
 const state=heroScheduleCalculator(catalog,area);
 if(!state.hasSchedule){heroSchedule.hidden=true;heroScheduleSignature='';return;}
 const signature=JSON.stringify([area,state.today,state.current,state.next]);
 if(signature===heroScheduleSignature)return;
 heroScheduleSignature=signature;heroSchedule.replaceChildren();heroSchedule.hidden=false;
 const dateLabel=date=>{
  if(date===state.today)return 'Hoje';
  const tomorrow=new Date(state.today+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
  if(date===iso(tomorrow))return 'Amanhã';
  return new Date(date+'T12:00:00Z').toLocaleDateString('pt-PT',{weekday:'short',day:'2-digit',month:'2-digit',year:date.slice(0,4)!==state.today.slice(0,4)?'numeric':undefined,timeZone:'UTC'});
 };
 const addRow=(label,items,isCurrent)=>{
  const row=document.createElement('div');row.className='hero-session';
  const tag=document.createElement('span');tag.className='hero-session-label';tag.textContent=label;
  const content=document.createElement('div');content.className='hero-session-content';
  for(const {session,modality,date} of items){
   const entry=document.createElement('div'),name=document.createElement('strong'),time=document.createElement('span');
   name.textContent=modality.name;
   time.textContent=[area==='all'?modality.area.toUpperCase():'',isCurrent?'':dateLabel(date),session.duration==null?session.time:session.time+'–'+endTime(session)].filter(Boolean).join(' · ');
   entry.append(name,time);content.append(entry);
  }
  if(!items.length){const message=document.createElement('span');message.textContent='Sem próximas aulas publicadas.';content.append(message);}
  row.append(tag,content);heroSchedule.append(row);
 };
 if(state.current.length)addRow('A decorrer',state.current,true);
 addRow(state.next.length>1?'Próximas aulas':'Próxima aula',state.next,false);siteMotion?.heroChanged();
}
setInterval(()=>{if(!document.hidden)renderHeroSchedule()},15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderHeroSchedule()});
function setPublicPhoto(container,url,alt){
 let img=container.querySelector('img.managed-photo');
 container.classList.toggle('has-managed-photo',!!url);
 if(!url){img?.remove();return;}
 if(!img){img=document.createElement('img');img.className='managed-photo';img.loading='lazy';img.decoding='async';container.append(img);}
 img.src=url;img.alt=alt;
}
function renderSitePhotos(){
 for(const a of ['fitness','wellness','dance']){
  const image=$('.area-card[data-go="'+a+'"] .area-photo');
  image.src=catalog.sitePhotos?.[a]?.cardImage||'/photos/'+a+'.png';
 }
 const space=catalog.sitePhotos?.[area]?.spaceImage;
 setPublicPhoto($('.studio-visual'),space,'Espaço do Studio 601');
}
function selectArea(a){if(!headings[a])a='all';area=a;const home=a==='all',label=home?'STUDIO 601':a.toUpperCase();document.body.dataset.area=a;const logo=home?'studio':a;$$('.brand-link').forEach(link=>{const mark=link.querySelector('.brand-logo'),img=mark.querySelector('img');mark.dataset.logo=logo;img.src='/logos/'+logo+'.png';img.alt=home?'Studio 601':'Studio '+label;link.setAttribute('aria-label',img.alt+' — voltar ao início do Studio 601')});document.title=home?'Studio 601 — Fitness, Wellness & Dance':label+' — Studio 601';$('#hero-title').textContent=headings[a][0];$('#hero-category').textContent=home?'STUDIO 601':'STUDIO 601 / '+label;$('#hero-count').textContent=headings[a][1];$('#hero-cta').textContent=home?'Conhecer as três áreas':a==='wellness'?'Explorar serviços':'Explorar aulas';$('#hero-cta').closest('a').href=home?'#areas':'#aulas';$('.hero-bottom a').href=home?'#areas':'#studio';$$('[data-select]').forEach(b=>{b.classList.toggle('active',b.dataset.select===a);b.setAttribute('aria-pressed',b.dataset.select===a)});$('#studio').hidden=home;$('#areas').hidden=!home;$('#aulas').hidden=home;$('#aulas h2').innerHTML=a==='fitness'?'ENCONTRA<br>O TEU TREINO.':a==='wellness'?'CUIDA<br>DE TI.':'ENCONTRA<br>O TEU MOVIMENTO.';$('#horarios').hidden=home||a==='wellness';$$('[data-area-only]').forEach(e=>{const schedule=e.getAttribute('href')==='#horarios';e.hidden=home||schedule&&a==='wellness';if(schedule)e.textContent='Horários'});$$('[data-home-only]').forEach(e=>e.hidden=!home);$('#studio .eyebrow').textContent=home?'O STUDIO':label;$('#studio h2').textContent=introductions[a].title;let intro=$('#studio-intro');if(!intro){intro=document.createElement('p');intro.id='studio-intro';$('#studio .copy-placeholder').replaceWith(intro);$('#studio .text-label').remove();}intro.textContent=introductions[a].text;$('#studio .media-id').textContent=home?'O ESPAÇO / STUDIO 601':label+' / O ESPAÇO';$('#series-area').textContent=label;$('#equipa .text-label').textContent=home?'A EQUIPA DO STUDIO':'A EQUIPA DE '+label;renderSitePhotos();renderCards();renderHeroSchedule();if(!home&&a!=='wellness')renderTimetable();siteMotion?.refresh(area);}

function renderCards(){const cards=$('#series-stack');cards.replaceChildren();const ms=catalog.modalities.filter(m=>m.area===area).sort((a,b)=>(a.sortOrder??Number.MAX_SAFE_INTEGER)-(b.sortOrder??Number.MAX_SAFE_INTEGER));ms.forEach((m,i)=>{const c=cardTemplate.cloneNode(true);c.style.setProperty('--card-index',i);c.querySelector('.series-number').textContent=String(i+1).padStart(2,'0');c.querySelectorAll('.series-category').forEach(x=>x.textContent=area.toUpperCase());c.querySelector('.series-title').textContent=m.name;const p=document.createElement('p');p.textContent=m.description||'';p.hidden=!m.description;c.querySelector('.copy-placeholder').replaceWith(p);if(m.area==='wellness'){const status=document.createElement('p');status.textContent='Sob marcação';p.after(status);}const assigned=(m.professionalIds||[]).map(id=>catalog.professionals.find(p=>p.id===id)?.name).filter(Boolean);if(assigned.length){const people=document.createElement('p');people.textContent=assigned.join(' / ');p.after(people);}let b=c.querySelector('[data-detail]');const directContact=m.mode==='information'||m.area==='wellness'&&m.mode==='appointment';if(directContact){const a=document.createElement('a');a.className=b.className;a.append(...b.childNodes);a.href=contactHref();b.replaceWith(a);b=a;}if(m.mode==='schedule'||m.area==='wellness'||m.area==='fitness'){b.remove();}else{b.querySelector('span').textContent=m.mode==='information'?'Contactar para informações':'Pedir marcação';if(!directContact)b.onclick=()=>detail(m.name,[m.description,...catalog.sessions.filter(s=>s.modalityId===m.id).map(s=>sessionSummary(s))].filter(Boolean).join('\n\n')+(m.mode==='appointment'?'\nServiço sob marcação. Contacta o Studio para combinar a tua sessão.':''));}setPublicPhoto(c.querySelector('.series-visual'),m.image,m.name);cards.append(c)});if(!ms.length)empty(cards,loading?'A carregar modalidades…':failed?'Não foi possível carregar. Atualiza a página para tentar novamente.':'Modalidades e serviços a anunciar.');endDrag();teamTrack.replaceChildren();const ps=catalog.professionals.filter(p=>area==='all'||p.areas.includes(area));ps.forEach((p,i)=>{const c=document.createElement('article');c.className=personTemplate.className;c.append(...personTemplate.cloneNode(true).childNodes);c.querySelector('.portrait-arrow')?.remove();c.querySelector('.portrait-index').textContent=String(i+1).padStart(2,'0');c.querySelector('.portrait-area').textContent=area==='all'?p.areas.map(a=>a.toUpperCase()).join(' / '):area.toUpperCase();c.querySelector('strong').textContent=p.name;c.querySelector('.portrait-role').textContent=p.role;setPublicPhoto(c,p.image,p.name);teamTrack.append(c)});if(!ps.length)empty(teamTrack,loading?'A carregar equipa…':'Equipa a anunciar.');teamTrack.scrollLeft=0;updateTeam();}
function updateTeam(){const count=teamTrack.querySelectorAll('.team-portrait').length;const max=teamTrack.scrollWidth-teamTrack.clientWidth;$('#prev-team').disabled=!count||teamTrack.scrollLeft<5;$('#next-team').disabled=!count||teamTrack.scrollLeft>=max-5;const width=(teamTrack.firstElementChild?.getBoundingClientRect().width||1)+22;$('#team-position').textContent=count?String(Math.min(count,Math.round(teamTrack.scrollLeft/width)+1)).padStart(2,'0')+' / '+String(count).padStart(2,'0'):'00 / 00';$('#team-progress-fill').style.width=(max>0?100/count+(100-100/count)*teamTrack.scrollLeft/max:100)+'%'}
function moveTeam(dir){teamTrack.scrollBy({left:dir*((teamTrack.firstElementChild?.getBoundingClientRect().width||0)+22),behavior:reduce?'instant':'smooth'})}
$('#prev-team').onclick=()=>moveTeam(-1);$('#next-team').onclick=()=>moveTeam(1);teamTrack.addEventListener('scroll',updateTeam,{passive:true});window.addEventListener('resize',()=>{endDrag();updateTeam()});teamTrack.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();moveTeam(e.key==='ArrowRight'?1:-1)}});
let drag=null,wasDragged=false;
teamTrack.addEventListener('dragstart',e=>e.preventDefault());
teamTrack.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='mouse'||e.button!==0||teamTrack.scrollWidth<=teamTrack.clientWidth)return;
 drag={id:e.pointerId,x:e.clientX,scroll:teamTrack.scrollLeft};wasDragged=false;
 teamTrack.setPointerCapture(e.pointerId);e.preventDefault();
});
teamTrack.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 const delta=e.clientX-drag.x;
 if(!wasDragged&&Math.abs(delta)<=6)return;
 wasDragged=true;teamTrack.classList.add('dragging');e.preventDefault();
 teamTrack.scrollLeft=drag.scroll-delta;
});
function endDrag(){
 const previous=drag;drag=null;teamTrack.classList.remove('dragging');
 if(previous&&teamTrack.hasPointerCapture(previous.id))teamTrack.releasePointerCapture(previous.id);
}
teamTrack.addEventListener('pointerup',endDrag);
teamTrack.addEventListener('pointercancel',endDrag);
teamTrack.addEventListener('lostpointercapture',endDrag);
teamTrack.addEventListener('click',e=>{if(wasDragged){e.preventDefault();e.stopImmediatePropagation();wasDragged=false}},true);

function contactHref(){const c=catalog.contact;return c.email?'mailto:'+c.email:(c.phone||c.secondaryPhone)?'tel:'+(c.phone||c.secondaryPhone).replace(/[^+\d]/g,''):'#contactos'}
function accessCondition(s){const ages=s.ageMin!=null&&s.ageMax!=null?s.ageMin+'–'+s.ageMax+' anos':s.ageMin!=null?'A partir dos '+s.ageMin+' anos':s.ageMax!=null?'Até aos '+s.ageMax+' anos':'';return [ages,s.accessNote].filter(Boolean).join(' · ')}
function sessionSummary(s){const days=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];return [s.recurrence==='weekly'?days[s.weekday]:s.date,s.duration==null?s.time:s.time+'–'+endTime(s),catalog.professionals.find(p=>p.id===s.professionalId)?.name,s.room,accessCondition(s)].filter(Boolean).join(' · ')}
function endTime(s){const [h,m]=s.time.split(':').map(Number),minutes=h*60+m+s.duration;return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0')}
function iso(d){return d.toISOString().slice(0,10)}
let selectedScheduleDay=1;
function renderTimetable(){
 if(area!=='fitness'&&area!=='dance')return;
 const local=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Lisbon'});
 const monday=new Date(local+'T12:00:00Z');
 monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7+week*7);
 const dates=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setUTCDate(d.getUTCDate()+i);return d});
 $('#week-label').textContent=dates[0].toLocaleDateString('pt-PT',{day:'2-digit',month:'short',timeZone:'UTC'})+' — '+dates[6].toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
 const sessions=catalog.sessions.filter(s=>s.published&&catalog.modalities.some(m=>m.id===s.modalityId&&m.published&&m.area===area));
 const byDay=dates.map(d=>sessions.filter(s=>!s.cancelledDates.includes(iso(d))&&(s.recurrence==='once'?s.date===iso(d):s.weekday===d.getUTCDay()&&(!s.startDate||iso(d)>=s.startDate)&&(!s.endDate||iso(d)<=s.endDate))));
 const visibleDays=dates.map((d,i)=>({d,i})).filter(({i})=>area!=='dance'||byDay[i].length);
 if(!visibleDays.some(({d})=>d.getUTCDay()===selectedScheduleDay))selectedScheduleDay=visibleDays[0]?.d.getUTCDay()??1;
 const navigation=$('#timetable-days');navigation.replaceChildren();navigation.hidden=!visibleDays.length;
 navigation.style.setProperty('--schedule-day-count',visibleDays.length||1);
 const labels=['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
 for(const {d,i} of visibleDays){
  const button=document.createElement('button'),name=document.createElement('span'),count=document.createElement('small');
  button.type='button';button.dataset.weekday=d.getUTCDay();
  button.setAttribute('aria-pressed',String(selectedScheduleDay===d.getUTCDay()));
  button.setAttribute('aria-controls','timetable-body');
  button.setAttribute('aria-label',d.toLocaleDateString('pt-PT',{weekday:'long',day:'2-digit',month:'2-digit',timeZone:'UTC'})+' · '+byDay[i].length+(byDay[i].length===1?' aula':' aulas'));
  name.textContent=labels[d.getUTCDay()];count.textContent=byDay[i].length+(byDay[i].length===1?' aula':' aulas');
  button.append(name,count);button.onclick=()=>{selectedScheduleDay=d.getUTCDay();renderTimetable();$('#timetable-days button[data-weekday="'+selectedScheduleDay+'"]').focus({preventScroll:true})};navigation.append(button);
 }
 const list=$('#timetable-body');list.replaceChildren();
 const selected=dates.findIndex(d=>d.getUTCDay()===selectedScheduleDay);
 const lessons=[...byDay[selected]].sort((a,b)=>a.time.localeCompare(b.time));
 $('#schedule-empty').textContent=lessons.length?'':loading?'A carregar horário…':failed?'Não foi possível carregar o horário. Atualiza a página.':byDay.some(day=>day.length)?'Sem aulas publicadas neste dia.':'Ainda não há aulas publicadas para esta semana.';
 for(const s of lessons){
  const modality=catalog.modalities.find(m=>m.id===s.modalityId),professional=catalog.professionals.find(p=>p.id===s.professionalId);
  const lesson=document.createElement('details'),summary=document.createElement('summary'),time=document.createElement('time'),content=document.createElement('span'),name=document.createElement('span');
  lesson.className='daily-lesson';lesson.dataset.sessionId=s.id;
  time.textContent=s.time;time.dateTime=iso(dates[selected])+'T'+s.time;
  name.className='daily-lesson-name';name.textContent=modality.name;content.append(name);
  const information=[professional?.name,s.duration==null?'':s.duration+' min',s.room,accessCondition(s)].filter(Boolean);
  if(information.length){const meta=document.createElement('span');meta.className='daily-lesson-meta';meta.textContent=information.join(' · ');content.append(meta);}
  const plus=document.createElement('span');plus.className='daily-plus';plus.setAttribute('aria-hidden','true');
  const icon=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','path');
  icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('fill','none');icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.5');path.setAttribute('d','M12 5v14M5 12h14');icon.append(path);plus.append(icon);
  summary.append(time,content,plus);
  const extra=document.createElement('div');extra.className='daily-extra';extra.textContent=[sessionSummary(s),modality.description].filter(Boolean).join('\n');
  lesson.append(summary,extra);list.append(lesson);
 }
 siteMotion?.scheduleChanged();
}

$('#week-prev').onclick=()=>{week--;renderTimetable()};$('#week-next').onclick=()=>{week++;renderTimetable()};$$('[data-select]').forEach(b=>b.onclick=()=>{selectArea(b.dataset.select);$('#inicio').scrollIntoView({behavior:reduce?'instant':'smooth'})});$$('[data-go]').forEach(b=>b.onclick=e=>{e.preventDefault();selectArea(b.dataset.go);$('#inicio').scrollIntoView({behavior:reduce?'instant':'smooth'})});$$('.close-detail').forEach(b=>b.onclick=()=>$('#detail').close());$('.contact [data-detail]').onclick=()=>{if(catalog.contact.email)location.href='mailto:'+catalog.contact.email;else if(catalog.contact.phone)location.href='tel:'+catalog.contact.phone.replace(/[^+\d]/g,'');else detail('Contacta o Studio','Os contactos serão publicados em breve.')};$$('[data-home]').forEach(b=>b.onclick=()=>selectArea('all'));selectArea('all');

let mapLibrary;
function loadMapLibrary(){
 if(!mapLibrary)mapLibrary=new Promise((resolve,reject)=>{const css=document.createElement('link');css.rel='stylesheet';css.href='/vendor/leaflet/leaflet.css';css.onerror=reject;css.onload=()=>{const script=document.createElement('script');script.src='/vendor/leaflet/leaflet.js';script.onload=()=>resolve(window.L);script.onerror=reject;document.head.append(script)};document.head.append(css)});
 return mapLibrary;
}
async function renderStudioMap(container,c){
 container.classList.add('contact-map');container.replaceChildren();
 const canvas=document.createElement('div');canvas.className='studio-map-canvas';canvas.setAttribute('role','region');canvas.setAttribute('aria-label','Mapa da localização do Studio 601');
 const note=document.createElement('p');note.className='map-message';note.textContent='A carregar o mapa…';note.setAttribute('role','status');
 const link=document.createElement('a');link.className='map-open-link';link.href=c.mapUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Abrir no Google Maps';container.append(canvas,note,link);
 try{const L=await loadMapLibrary();const coordinates=[41.849938,-8.4176481]; // Localização confirmada na ficha Google Maps do Studio.
  const localMap=L.map(canvas,{scrollWheelZoom:false,attributionControl:false,zoomControl:false}).setView(coordinates,17);
  L.control.attribution({prefix:false}).addTo(localMap);L.control.zoom({zoomInTitle:'Aproximar',zoomOutTitle:'Afastar'}).addTo(localMap);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin',attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'}).addTo(localMap);
  const pin=L.divIcon({className:'studio-map-pin',iconSize:[32,44],iconAnchor:[16,44],html:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" role="img" aria-label="Localização do Studio 601"><path d="M16 2C8.3 2 2 8.3 2 16c0 10 14 26 14 26S30 26 30 16C30 8.3 23.7 2 16 2Z" fill="var(--accent)" stroke="#fff" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="#fff"/></svg>'});
  L.marker(coordinates,{icon:pin,interactive:false,keyboard:false}).addTo(localMap);
  tiles.on('load',()=>{if(canvas.querySelector('.leaflet-tile-loaded'))note.remove();else note.textContent='Não foi possível carregar o mapa. Abre a localização no Google Maps.'});
  new ResizeObserver(()=>localMap.invalidateSize({pan:false})).observe(canvas);
 }catch{note.textContent='Não foi possível carregar o mapa. Abre a localização no Google Maps.'}
}
function renderContacts(){
 const c=catalog.contact,ps=$$('.contact-details p');
 ps[0].textContent=c.address||'Morada a anunciar';
 if(c.mapUrl){const link=document.createElement('a');link.href=c.mapUrl;link.target='_blank';link.rel='noopener noreferrer';link.className='location-link';link.textContent='Ver no Google Maps';ps[0].append(document.createElement('br'),link);}
 ps[1].replaceChildren();
 const phones=[c.phone,c.secondaryPhone].filter(Boolean);
 for(const phone of phones){const link=document.createElement('a');link.href='tel:'+phone.replace(/[^+\d]/g,'');link.textContent=phone;ps[1].append(link,document.createElement('br'));}
 if(phones.length&&c.phoneNote){const note=document.createElement('small');note.className='call-note';note.textContent=c.phoneNote;ps[1].append(note,document.createElement('br'));}
 if(c.email){const link=document.createElement('a');link.href='mailto:'+c.email;link.textContent=c.email;ps[1].append(link);}
 if(!ps[1].textContent)ps[1].textContent='Contactos a anunciar';
 ps[2].replaceChildren();
 for(const [label,href] of [['Instagram',c.instagramUrl],['Facebook',c.facebookUrl]]){if(!href)continue;if(ps[2].childElementCount)ps[2].append(' / ');const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=label;link.className='social-link';ps[2].append(link);}
 if(!ps[2].textContent)ps[2].textContent='Redes sociais a anunciar';
 const map=$('.map-placeholder');
 if(c.mapUrl){const url=new URL(c.mapUrl);let cid=url.searchParams.get('cid');const place=url.href.match(/1s0x[0-9a-f]+:0x([0-9a-f]+)/i);if(!cid&&place)cid=BigInt('0x'+place[1]).toString();
  if(cid==='9423403120071143153'){renderStudioMap(map,c);return;}
  const embed=new URL('https://www.google.com/maps');if(c.address){embed.searchParams.set('q',c.address);embed.searchParams.set('output','embed');}else return;
  const frame=document.createElement('iframe');frame.src=embed.href;frame.title='Localização do Studio 601';frame.loading='eager';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;map.classList.add('contact-map');map.replaceChildren(frame);
 }
}
fetch('/api/catalog').then(async r=>{if(!r.ok)throw Error();catalog=(await r.json()).data;loading=false;renderContacts();selectArea(area)}).catch(()=>{loading=false;failed=true;selectArea(area)});

// Let the floating menu stop above the footer as it enters the viewport.
const dockFooter=$('footer'), floatingDock=$('.dock');
if(dockFooter&&floatingDock){
 let dockFramePending=false;
 const updateDockBoundary=()=>{
  dockFramePending=false;
  const lift=Math.max(0,window.innerHeight-dockFooter.getBoundingClientRect().top);
  floatingDock.style.setProperty('--dock-footer-lift',lift+'px');
 };
 const queueDockBoundary=()=>{
  if(dockFramePending)return;
  dockFramePending=true;
  requestAnimationFrame(updateDockBoundary);
 };
 window.addEventListener('scroll',queueDockBoundary,{passive:true});
 window.addEventListener('resize',queueDockBoundary);
 new ResizeObserver(queueDockBoundary).observe(document.body);
 updateDockBoundary();
}

import('/studio-motion.mjs').then(({createSiteMotion})=>{siteMotion=createSiteMotion();siteMotion.refresh(area)}).catch(()=>{});
