import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { importDance,source } from '../lib/dance-import.mjs';
import { importFitness } from '../lib/fitness-import.mjs';
import { schema,empty } from '../lib/catalog.ts';

test('Dance: migration, exact schedule, access conditions, no invented values, idempotence and preservation',()=>{
 const fitness=importFitness(empty).data;
 fitness.modalities.push({id:randomUUID(),name:'Wellness existente',area:'wellness',kind:'service',mode:'appointment',description:'Texto existente',published:false});
 const {data,report}=importDance(fitness);schema.parse(data);
 assert.equal(data.schemaVersion,2);assert.equal(report.newModalities,18);assert.equal(report.newProfessionals,5);assert.equal(report.newSessions,19);assert.deepEqual(report.conflicts,[]);
 assert.deepEqual(data.modalities.filter(m=>m.area!=='dance'),fitness.modalities);assert.deepEqual(data.sessions.filter(s=>fitness.sessions.some(old=>old.id===s.id)),fitness.sessions);
 const rows=data.sessions.filter(s=>s.source===source);
 assert(rows.every(s=>s.duration===null&&s.room===''&&s.startDate===''&&s.endDate===''));
 assert(data.professionals.every(p=>p.role===''&&p.bio===''&&p.areas.includes('dance')&&p.published));
 assert.deepEqual([...new Set(rows.map(s=>s.weekday))].sort(),[1,2,4,5,6]);
 const coaching=data.modalities.find(m=>m.name==='Coaching');assert.deepEqual(rows.filter(s=>s.modalityId===coaching.id).map(s=>[s.weekday,s.time]),[[5,'16:00'],[6,'18:30']]);
 const mtv=data.modalities.find(m=>m.name==='MTV Dance');const session=rows.find(s=>s.modalityId===mtv.id);assert.equal(session.ageMin,4);assert.equal(session.ageMax,6);
 assert.equal(rows.filter(s=>s.accessNote==='Avaliar pelo nível técnico').length,3);assert.equal(rows.filter(s=>s.accessNote==='Nível aberto').length,1);
 const again=importDance(data);assert.deepEqual(again.data,data);assert.equal(again.report.newSessions,0);assert.equal(again.report.existingSessions,19);
 const edited=structuredClone(data);edited.sessions.find(s=>s.id===session.id).time='17:15';edited.professionals[0].bio='Texto manual';edited.professionals[0].areas.push('fitness');
 const repeat=importDance(edited);assert.deepEqual(repeat.data,edited);assert.equal(repeat.report.conflicts.length,1);
 const bad=structuredClone(data);bad.sessions.find(s=>s.id===session.id).ageMax=3;assert.equal(schema.safeParse(bad).success,false);
 bad.sessions.find(s=>s.id===session.id).ageMax=6;bad.sessions.find(s=>s.id===session.id).duration=0;assert.equal(schema.safeParse(bad).success,false);
});

test('Dance: reuse professionals, protect homonyms, aliases, ambiguous old labels and manual sessions',()=>{
 const existing=structuredClone(empty);
 existing.professionals.push({id:randomUUID(),name:'Isabel',areas:['fitness'],role:'Função já configurada',bio:'Biografia já configurada',published:true});
 existing.modalities.push({id:randomUUID(),name:'Commercial Dance',area:'dance',kind:'group',mode:'schedule',description:'Descrição preservada',published:true,source:'Mapa geral 2026/2027',importKey:'dance-old-commercial'});
 existing.modalities.push({id:randomUUID(),name:'Ballet / Pré-Pontas',area:'dance',kind:'group',mode:'schedule',description:'',published:true});
 existing.modalities.push({id:randomUUID(),name:'Lady Styling',area:'dance',kind:'group',mode:'schedule',description:'',published:true});
 const result=importDance(existing);schema.parse(result.data);
 assert.equal(result.data.professionals.find(p=>p.name==='Isabel').id,existing.professionals[0].id);
 assert.deepEqual(result.data.professionals.find(p=>p.name==='Isabel').areas,['fitness','dance']);
 assert.equal(result.data.professionals.find(p=>p.name==='Isabel').bio,'Biografia já configurada');
 assert.equal(result.data.modalities.find(m=>m.name==='Commercial 1').id,existing.modalities[0].id);
 assert(!result.data.modalities.some(m=>m.name==='Ballet / Pré Provas'));assert(result.report.conflicts.some(c=>c.includes('Pré-Pontas')));
 assert.equal(result.data.modalities.find(m=>m.name==='Lady Styling').published,true);assert.equal(result.report.notes.length,1);
 const ambiguous=structuredClone(empty);ambiguous.professionals.push(...[1,2].map(()=>({id:randomUUID(),name:'Iris',areas:['dance'],role:'',bio:'',published:true})));
 const homonyms=importDance(ambiguous);assert(homonyms.report.conflicts.some(c=>c.includes('homónimos')));assert.equal(homonyms.data.professionals.filter(p=>p.name==='Iris').length,2);
 const manual=importDance(empty).data;const mtv=manual.modalities.find(m=>m.name==='MTV Dance');const row=manual.sessions.find(s=>s.modalityId===mtv.id);delete row.importKey;delete row.importBaseline;delete row.source;row.time='17:20';
 const protectedRows=importDance(manual);assert.deepEqual(protectedRows.data,manual);assert(protectedRows.report.conflicts.some(c=>c.includes('MTV Dance')));
});

test('Dance: reconcile known old import against its saved baseline without keeping old durations',()=>{
 const old=importDance(empty).data;
 const m=old.modalities.find(m=>m.name==='Acrodance');m.name='Acro Dance';m.source='Mapa geral 2026/2027';m.importKey='old-acro';m.importBaseline=JSON.stringify({name:m.name,area:m.area,kind:m.kind,mode:m.mode,published:m.published});
 const row=old.sessions.find(s=>s.modalityId===m.id);row.time='17:00';row.duration=45;row.source='Mapa geral 2026/2027';row.importKey='old-acro-session';const keys=['modalityId','professionalId','recurrence','weekday','time','duration','ageMin','ageMax','accessNote','published'];row.importBaseline=JSON.stringify(Object.fromEntries(keys.map(k=>[k,row[k]??null])));
 const result=importDance(old);assert.equal(result.report.updatedModalities,1);assert.equal(result.report.updatedSessions,1);assert.equal(result.data.sessions.find(s=>s.id===row.id).duration,null);assert.equal(result.data.sessions.find(s=>s.id===row.id).time,'17:30');assert.equal(result.data.sessions.length,19);
});
