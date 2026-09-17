import { randomUUID } from 'node:crypto';

export const source='Serviços Wellness — lista fornecida pelo proprietário';
export const names=['Pilates de Aparelhos','Pilates Clínico','Pilates Clássico','Pilates Pré e Pós Parto','Reabilitação','Aulas Individuais','Aulas em Grupo Pequeno'];
const keys=['name','area','kind','mode','sortOrder','published'];
const snapshot=row=>Object.fromEntries(keys.map(k=>[k,row[k]??null]));
const norm=s=>s.trim().normalize('NFC').toLocaleLowerCase('pt-PT');
export function importWellness(previous){
 const data=structuredClone(previous),report={newServices:0,existingServices:0,updatedServices:0,conflicts:[]};
 for(const [i,name] of names.entries()){
  const key=`wellness-owner-service-${i+1}`,wanted={name,area:'wellness',kind:'service',mode:'appointment',sortOrder:i+1,published:true};
  const matches=data.modalities.filter(m=>m.importKey===key||(m.area==='wellness'&&norm(m.name)===norm(name)));
  if(matches.length>1){report.conflicts.push(`${name}: vários registos correspondentes; não foram fundidos ou duplicados.`);continue;}
  const row=matches[0];
  if(!row){const added={id:randomUUID(),...wanted,description:'',professionalIds:[],source,importKey:key};added.importBaseline=JSON.stringify(snapshot(added));data.modalities.push(added);report.newServices++;continue;}
  report.existingServices++;
  const adoptable=!row.importKey&&row.name===name&&row.area==='wellness'&&row.kind==='service'&&row.mode==='appointment'&&row.published&&row.sortOrder==null;
  if(adoptable){row.sortOrder=i+1;row.source=source;row.importKey=key;row.importBaseline=JSON.stringify(snapshot(row));report.updatedServices++;continue;}
  const differs=JSON.stringify(snapshot(row))!==JSON.stringify(wanted);
  let manuallyChanged=false;
  if(row.importBaseline){try{manuallyChanged=JSON.stringify(snapshot(row))!==JSON.stringify(JSON.parse(row.importBaseline));}catch{manuallyChanged=true;}}
  if(manuallyChanged||(differs&&(row.source!==source||!row.importBaseline))){report.conflicts.push(`${name}: campos existentes diferentes ou alterados manualmente; preservados.`);continue;}
  if(differs){Object.assign(row,wanted);row.importBaseline=JSON.stringify(snapshot(row));report.updatedServices++;}
 }
 return {data,report};
}
