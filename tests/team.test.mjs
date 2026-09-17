import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {schema,empty} from '../lib/catalog.ts';
import {updateMember} from '../lib/team.ts';

test('Equipa global com várias áreas: edição preserva serviços, sessões e outras pessoas',()=>{
 const person={id:randomUUID(),name:'Pessoa de teste',areas:['dance'],role:'',bio:'',published:true};
 const other={...person,id:randomUUID(),name:'Outra pessoa'};
 const modalities=[{id:randomUUID(),area:'dance',name:'Aula',description:'',kind:'group',mode:'schedule',published:true,professionalIds:[person.id,other.id]}];
 const sessions=[{id:randomUUID(),modalityId:modalities[0].id,professionalId:person.id,room:'',recurrence:'weekly',weekday:1,date:'',startDate:'',endDate:'',time:'18:00',duration:null,cancelledDates:[],published:true}];
 const data={...empty,professionals:[person,other],modalities,sessions};
 const member={...person,areas:['fitness','wellness','dance'],bio:'Texto editado'};
 const saved=updateMember(data,member);
 assert(schema.safeParse(saved).success);
 assert.equal(saved.professionals.length,2);
 assert.deepEqual(saved.professionals[0],member);
 assert.deepEqual(saved.professionals[1],other);
 assert.deepEqual(saved.modalities,data.modalities);
 assert.deepEqual(saved.sessions,data.sessions);
 assert.deepEqual(saved.contact,data.contact);
 assert.deepEqual(updateMember(saved,member),saved);
 assert.equal(schema.safeParse(updateMember(saved,{...member,areas:['fitness']})).success,false);
 const added=updateMember(saved,{...member,id:randomUUID()});
 assert.equal(added.professionals.length,3);
 assert.deepEqual(added.modalities,data.modalities);
});
