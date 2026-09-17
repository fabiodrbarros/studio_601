import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importFitness } from '../lib/fitness-import.mjs';
import { empty,schema } from '../lib/catalog.ts';

test('Fitness: lote completo, associações vazias, simultâneas, idempotência e preservação manual',()=>{
 const {data,report}=importFitness(empty);schema.parse(data);
 assert.equal(report.newModalities,15);assert.equal(report.newServices,2);assert.equal(report.newSessions,26);
 assert.equal(data.professionals.length,0);
 assert(data.sessions.every(s=>s.professionalId===''&&s.room===''&&s.startDate===''&&s.endDate===''));
 const pump=data.modalities.find(m=>m.name==='Pump');assert.deepEqual([...new Set(data.sessions.filter(s=>s.modalityId===pump.id).map(s=>s.duration))].sort(),[30,45,60]);
 assert.equal(data.sessions.filter(s=>s.weekday===4&&s.time==='18:00').length,2);
 const pilates=data.modalities.find(m=>m.name==='Pilates');assert(data.sessions.some(s=>s.modalityId===pilates.id&&s.weekday===3&&s.time==='18:00'&&s.duration===50));
 assert(data.modalities.filter(m=>m.mode==='information').every(m=>!data.sessions.some(s=>s.modalityId===m.id)));
 const again=importFitness(data);assert.deepEqual(again.data,data);assert.equal(again.report.newSessions,0);assert.equal(again.report.existingSessions,26);
 const edited=structuredClone(data);edited.sessions[0].time='12:05';edited.modalities[0].description='Texto manual';
 const result=importFitness(edited);assert.deepEqual(result.data,edited);assert.equal(result.report.conflicts.length,1);
 const unrelated=structuredClone(data);unrelated.modalities[0].area='dance';const preserved=importFitness(unrelated);assert.deepEqual(preserved.data.modalities[0],unrelated.modalities[0]);assert(preserved.report.conflicts.length);
});
