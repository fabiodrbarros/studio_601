import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importWellness,names } from '../lib/wellness-import.mjs';
import { importDance } from '../lib/dance-import.mjs';
import { importFitness } from '../lib/fitness-import.mjs';
import { schema,empty } from '../lib/catalog.ts';
test('Wellness: seven separate offers, order, no sessions, idempotence, manual edits and associations',()=>{
 const before=importDance(importFitness(empty).data).data;
 const {data,report}=importWellness(before);schema.parse(data);assert.equal(report.newServices,7);assert.deepEqual(report.conflicts,[]);
 const services=data.modalities.filter(m=>m.area==='wellness');assert.deepEqual(services.map(m=>m.name),names);assert.deepEqual(services.map(m=>m.sortOrder),[1,2,3,4,5,6,7]);
 assert(services.every(m=>m.mode==='appointment'&&m.description===''&&m.professionalIds.length===0&&m.published));
 assert.deepEqual(data.sessions,before.sessions);assert.deepEqual(data.professionals,before.professionals);assert.deepEqual(data.modalities.filter(m=>m.area!=='wellness'),before.modalities);
 const again=importWellness(data);assert.deepEqual(again.data,data);assert.equal(again.report.newServices,0);assert.equal(again.report.existingServices,7);
 const manual=structuredClone(data);manual.modalities.find(m=>m.id===services[0].id).sortOrder=8;manual.modalities.find(m=>m.id===services[1].id).description='Texto manual';
 const repeated=importWellness(manual);assert.deepEqual(repeated.data,manual);assert.equal(repeated.report.conflicts.length,1);
 const assigned=structuredClone(data);assigned.modalities.find(m=>m.id===services[0].id).professionalIds=[assigned.professionals[0].id];assert.equal(schema.safeParse(assigned).success,false);assigned.professionals[0].areas.push('wellness');assert(schema.safeParse(assigned).success);
 const duplicate=structuredClone(data);duplicate.modalities.push({...services[0],id:crypto.randomUUID()});assert(importWellness(duplicate).report.conflicts.length);assert.equal(importWellness(duplicate).data.modalities.length,duplicate.modalities.length);
});
