import { backup } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname,join,resolve } from 'node:path';
import { database,readStoredCatalog,writeStoredCatalog } from '../lib/local-db.mjs';
import { schema,empty } from '../lib/catalog.ts';
import { importDance } from '../lib/dance-import.mjs';

const db=database();
try{
 const directory=join(dirname(resolve(process.env.STUDIO_DB_PATH||'./data/studio601.sqlite')),'backups');mkdirSync(directory,{recursive:true});
 const path=join(directory,'before-dance-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');await backup(db,path);
 db.exec('BEGIN IMMEDIATE');
 try{
  const row=readStoredCatalog(),previous=row?JSON.parse(String(row.data)):structuredClone(empty);
  const {data,report}=importDance(previous);schema.parse(data);
  if(JSON.stringify(data)!==JSON.stringify(previous)&&!writeStoredCatalog(row?Number(row.version):0,JSON.stringify(data)))throw Error('Alteração concorrente.');
  db.exec('COMMIT');console.log(JSON.stringify({backup:path,...report},null,2));
 }catch(e){db.exec('ROLLBACK');throw e;}
}finally{db.close();}
