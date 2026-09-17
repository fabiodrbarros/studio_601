import { randomUUID } from 'node:crypto';

export const source = 'Mapa de aulas 2026/2027';
export const names = ['Step Local','GAP','Virtual Cycling','Jump','Pump','Box Training','Studio Tone','Cycling','Localizada','Treino Funcional','Combat','Pump | Attack','HIIT','Treino Funcional / Challenge','Pilates'];
export const services = ['Personal Training','Small Group Training'];
export const weekly = [
 [1,'12:00','Step Local',30],[1,'12:30','GAP',30],[1,'18:00','Virtual Cycling',45],[1,'19:00','Jump',30],[1,'19:30','Pump',45],[1,'20:15','Box Training',50],
 [2,'10:30','Studio Tone',30],[2,'11:00','Pump',30],[2,'18:00','Pump',60],[2,'18:15','Cycling',45],[2,'19:00','GAP',30],[2,'19:30','Localizada',30],
 [3,'12:00','Jump',30],[3,'12:30','Localizada',30],[3,'18:00','Pilates',50],[3,'19:00','Virtual Cycling',45],[3,'20:00','Cycling',45],
 [4,'10:30','Step Local',30],[4,'18:00','Virtual Cycling',45],[4,'18:00','Treino Funcional',60],[4,'19:00','Combat',45],[4,'19:45','Pump | Attack',45],
 [5,'10:30','HIIT',30],[5,'11:00','Pump',30],[5,'13:00','Treino Funcional / Challenge',60],[5,'17:30','Virtual Cycling',45],
];
const sameName = (a,b) => a.trim().normalize('NFC').toLocaleLowerCase('pt-PT') === b.trim().normalize('NFC').toLocaleLowerCase('pt-PT');

/** Adds missing rows only; stable import keys protect later manual edits. */
export function importFitness(previous) {
 const data=structuredClone(previous),report={newModalities:0,existingModalities:0,newServices:0,existingServices:0,newSessions:0,existingSessions:0,conflicts:[]};
 const links=new Map();
 for(const [index,name] of [...names,...services].entries()){
  const extra=index>=names.length,importKey=`fitness-2026-2027-modality-${index+1}`,mode=extra?'information':'schedule',kind=extra?'service':'group';
  const matches=data.modalities.filter(m=>m.importKey===importKey||(m.area==='fitness'&&sameName(m.name,name)));
  if(matches.length>1){report.conflicts.push(`Mais de uma modalidade corresponde a ${name}; sessões associadas não acrescentadas.`);continue;}
  let m=matches[0];
  if(m){report[extra?'existingServices':'existingModalities']++;if(m.area!=='fitness'||m.name!==name||m.mode!==mode||m.kind!==kind||!m.published)report.conflicts.push(`${name}: registo existente com valores diferentes; preservado.`);}
  else{m={id:randomUUID(),name,area:'fitness',description:'',kind,mode,published:true,source:extra?'Serviços adicionais indicados pelo proprietário':source,importKey};data.modalities.push(m);report[extra?'newServices':'newModalities']++;}
  if(m.area==='fitness'&&m.mode==='schedule')links.set(name,m.id);
 }
 for(const [index,[weekday,time,name,duration]] of weekly.entries()){
  const modalityId=links.get(name);if(!modalityId){report.conflicts.push(`${name}, dia ${weekday}, ${time}: modalidade incompatível; sessão não acrescentada.`);continue;}
  const importKey=`fitness-2026-2027-session-${index+1}`;
  const matches=data.sessions.filter(s=>s.importKey===importKey||(s.modalityId===modalityId&&s.recurrence==='weekly'&&s.weekday===weekday&&s.time===time));
  if(matches.length){report.existingSessions++;if(matches.length>1||matches.some(s=>s.modalityId!==modalityId||s.recurrence!=='weekly'||s.weekday!==weekday||s.time!==time||s.duration!==duration||!s.published||s.startDate||s.endDate||s.cancelledDates.length))report.conflicts.push(`${name}, dia ${weekday}, ${time}: sessão existente diferente ou ambígua; preservada.`);continue;}
  data.sessions.push({id:randomUUID(),modalityId,professionalId:'',room:'',recurrence:'weekly',weekday,date:'',startDate:'',endDate:'',time,duration,cancelledDates:[],published:true,source,importKey});report.newSessions++;
 }
 return {data,report};
}
