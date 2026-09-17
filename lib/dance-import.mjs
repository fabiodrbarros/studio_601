import { randomUUID } from 'node:crypto';
import { migrateCatalogV2 } from '../db/migrations/0002-catalog-model.mjs';

export const source='Mapa específico Studio Dance 2026/2027';
export const names=['MTV Dance','Commercial 1','Choreography','Commercial 2 / Funk','Commercial 3 / Funk','Coaching','Acrodance','Ballet 1','Contemporâneo 2','Grupo de Competição','Baby Class','Urbanas','Breaking','Karaté','Contemporâneo 1','Ballet 2','Ballet / Pré Provas','Jazz'];
export const professionals=['Isabel','Iris','Amanda','João','Oceane'];
export const weekly=[
 [1,'17:10','MTV Dance','Isabel',4,6,''],[1,'18:00','Commercial 1','Isabel',7,9,''],
 [2,'17:10','Choreography','Iris',10,14,''],
 [4,'17:10','Commercial 2 / Funk','Iris',8,14,''],[4,'20:30','Commercial 3 / Funk','Iris',15,null,''],
 [5,'16:00','Coaching','Amanda',null,null,''],[5,'17:30','Acrodance','Isabel',6,null,''],[5,'18:30','Ballet 1','Amanda',6,9,''],[5,'19:30','Contemporâneo 2','Amanda',null,null,'Avaliar pelo nível técnico'],[5,'21:00','Grupo de Competição','Iris',null,null,'Avaliar pelo nível técnico'],
 [6,'10:30','Baby Class','Isabel',3,5,''],[6,'11:20','Urbanas','Isabel',14,null,''],[6,'12:10','Breaking','João',6,null,''],[6,'13:30','Karaté','Oceane',6,null,''],[6,'14:30','Contemporâneo 1','Amanda',6,null,''],[6,'15:30','Ballet 2','Amanda',10,14,''],[6,'16:30','Ballet / Pré Provas','Amanda',null,null,'Avaliar pelo nível técnico'],[6,'17:30','Jazz','Amanda',null,null,'Nível aberto'],[6,'18:30','Coaching','Amanda',null,null,''],
];
const aliases={'Commercial 1':['Commercial Dance'],Acrodance:['Acro Dance'],Urbanas:['Danças Urbanas'],'Ballet 1':['Ballet I'],'Ballet 2':['Ballet II'],'Contemporâneo 1':['Contemporâneo I'],'Contemporâneo 2':['Contemporâneo II']};
const substantial={'Ballet / Pré Provas':['Ballet / Pré-Pontas','Ballet / Pré Pontas'],Jazz:['Jazz Acro']};
const norm=s=>s.trim().normalize('NFC').toLocaleLowerCase('pt-PT').replace(/\s+/g,' ');
const fields=(row,keys)=>Object.fromEntries(keys.map(k=>[k,row[k]??null]));
const modalityKeys=['name','area','kind','mode','published'];
const sessionKeys=['modalityId','professionalId','recurrence','weekday','time','duration','ageMin','ageMax','accessNote','published'];
const priorImport=row=>!!row.importKey&&/mapa.*2026.?2027/i.test(row.source||'');
function manuallyChanged(row,keys){
 if(!row.importBaseline)return null;
 try{return JSON.stringify(fields(row,keys))!==JSON.stringify(JSON.parse(row.importBaseline));}catch{return true;}
}
function stamp(row,key,keys){row.source=source;row.importKey=key;row.importBaseline=JSON.stringify(fields(row,keys));}

export function importDance(previous){
 const data=migrateCatalogV2(previous),report={newModalities:0,existingModalities:0,updatedModalities:0,newProfessionals:0,existingProfessionals:0,updatedProfessionals:0,newSessions:0,existingSessions:0,updatedSessions:0,conflicts:[],notes:[]};
 const modalityIds=new Map(),professionalIds=new Map();
 const conflict=message=>report.conflicts.push(message);
 for(const [index,name] of names.entries()){
  const key=`dance-specific-2026-2027-modality-${index+1}`,known=[name,...(aliases[name]||[])].map(norm);
  const matches=data.modalities.filter(m=>m.importKey===key||(m.area==='dance'&&known.includes(norm(m.name))));
  const uncertain=data.modalities.filter(m=>m.area==='dance'&&(substantial[name]||[]).map(norm).includes(norm(m.name)));
  if(matches.length>1||uncertain.length){conflict(`${name}: correspondência ambígua${uncertain.length?' com '+uncertain.map(m=>m.name).join(', '):''}; nenhum registo fundido ou acrescentado.`);continue;}
  let row=matches[0];const wanted={name,area:'dance',kind:'group',mode:'schedule',published:true};
  if(!row){row={id:randomUUID(),...wanted,description:''};stamp(row,key,modalityKeys);data.modalities.push(row);report.newModalities++;}
  else{
   report.existingModalities++;
   const differs=JSON.stringify(fields(row,modalityKeys))!==JSON.stringify(wanted);
   const untrackedChange=!row.importBaseline&&['area','kind','mode','published'].some(k=>row[k]!==wanted[k]);
   if(manuallyChanged(row,modalityKeys)===true||(differs&&(!priorImport(row)||untrackedChange))){conflict(`${name}: alterações manuais ou origem não reconhecida; registo e sessões preservados.`);continue;}
   if(differs){Object.assign(row,wanted);stamp(row,key,modalityKeys);report.updatedModalities++;}
  }
  modalityIds.set(name,row.id);
 }
 for(const [index,name] of professionals.entries()){
  const key=`dance-specific-2026-2027-professional-${index+1}`;
  const matches=data.professionals.filter(p=>p.importKey===key||norm(p.name)===norm(name));
  if(matches.length>1){conflict(`${name}: profissionais homónimos; não foram fundidos nem associados arbitrariamente.`);continue;}
  let row=matches[0];
  if(!row){row={id:randomUUID(),name,areas:['dance'],role:'',bio:'',published:true};stamp(row,key,['name','published']);data.professionals.push(row);report.newProfessionals++;}
  else{
   report.existingProfessionals++;
   if(!row.published||norm(row.name)!==norm(name)||manuallyChanged(row,['name','published'])===true||(row.importKey===key&&!row.areas.includes('dance'))){conflict(`${name}: nome, área ou publicação alterados manualmente; profissional preservado.`);continue;}
   if(!row.areas.includes('dance')){row.areas.push('dance');report.updatedProfessionals++;}
  }
  professionalIds.set(name,row.id);
 }
 for(const [index,[weekday,time,name,professional,ageMin,ageMax,accessNote]] of weekly.entries()){
  const modalityId=modalityIds.get(name),professionalId=professionalIds.get(professional);
  if(!modalityId||!professionalId){conflict(`${name}, dia ${weekday}, ${time}: associação pendente; sessão não acrescentada.`);continue;}
  const key=`dance-specific-2026-2027-session-${index+1}`;
  const wanted={modalityId,professionalId,recurrence:'weekly',weekday,time,duration:null,ageMin,ageMax,accessNote,published:true};
  let matches=data.sessions.filter(s=>s.importKey===key||(s.modalityId===modalityId&&s.recurrence==='weekly'&&s.weekday===weekday&&s.time===time));
  // Recognize an older import of the same class; do not add a second row to dodge a conflict.
  if(!matches.length)matches=data.sessions.filter(s=>s.modalityId===modalityId&&(weekly.filter(w=>w[2]===name).length===1||!s.importKey?.startsWith('dance-specific-2026-2027-')));
  if(matches.length>1){conflict(`${name}, dia ${weekday}, ${time}: várias sessões anteriores possíveis; preservadas.`);continue;}
  const row=matches[0];
  if(!row){const added={id:randomUUID(),...wanted,room:'',date:'',startDate:'',endDate:'',cancelledDates:[]};stamp(added,key,sessionKeys);data.sessions.push(added);report.newSessions++;}
  else{
   report.existingSessions++;
   const differs=JSON.stringify(fields(row,sessionKeys))!==JSON.stringify(wanted);
   if(manuallyChanged(row,sessionKeys)===true||(differs&&(!priorImport(row)||!row.importBaseline))){conflict(`${name}, dia ${weekday}, ${time}: sessão anterior incompatível sem confirmação de origem das alterações; preservada.`);continue;}
   if(differs){Object.assign(row,wanted);stamp(row,key,sessionKeys);report.updatedSessions++;}
  }
 }
 const lady=data.modalities.filter(m=>m.area==='dance'&&norm(m.name)==='lady styling');
 if(lady.length)report.notes.push('Lady Styling não consta do mapa específico; todos os registos existentes foram preservados.');
 return {data,report};
}
