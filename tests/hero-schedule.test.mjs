import test from 'node:test';
import assert from 'node:assert/strict';
import { getHeroSchedule, getHeroScheduleGroups } from '../public/hero-schedule.mjs';

const fitness={id:'fitness',name:'Pilates',area:'fitness',mode:'schedule',published:true};
const dance={id:'dance',name:'Ballet',area:'dance',mode:'schedule',published:true};
const session=(changes={})=>({id:'session',modalityId:'fitness',published:true,recurrence:'weekly',weekday:4,time:'18:00',duration:50,startDate:'',endDate:'',date:'',cancelledDates:[],...changes});
const catalog=sessions=>({modalities:[fitness,dance,{id:'wellness',name:'Pilates Clínico',area:'wellness',mode:'appointment',published:true}],sessions});

test('overview shows Fitness before Dance with independently selected current and next classes',()=>{
 const data=catalog([session(),session({id:'fitness-next',time:'20:00'}),session({id:'dance-next',modalityId:'dance',time:'19:00',duration:null})]);
 const now=new Date('2026-09-17T17:15:00Z');
 const groups=getHeroScheduleGroups(data,'all',now);
 assert.deepEqual(groups.map(group=>group.area),['fitness','dance']);
 assert.equal(groups[0].current[0].session.id,'session');
 assert.equal(groups[0].next[0].session.id,'fitness-next');
 assert.equal(groups[1].next[0].session.id,'dance-next');
 for(const area of ['fitness','dance'])assert.deepEqual(getHeroScheduleGroups(data,area,now).map(group=>group.area),[area]);
 assert.deepEqual(getHeroScheduleGroups(data,'wellness',now),[]);
 assert.deepEqual(getHeroScheduleGroups({modalities:[],sessions:[]},'all',now),[]);
});

test('Portugal time identifies current classes and excludes them from the next start',()=>{
 const data=catalog([session(),session({id:'next',time:'19:00'})]);
 const result=getHeroSchedule(data,'fitness',new Date('2026-09-17T17:15:00Z'));
 assert.equal(result.today,'2026-09-17');
 assert.equal(result.current[0].modality.name,'Pilates');
 assert.equal(result.next[0].session.id,'next');
 assert.equal(getHeroSchedule(data,'fitness',new Date('2026-09-17T17:50:00Z')).current.length,0);
 assert.equal(getHeroSchedule(data,'fitness',new Date('2026-09-17T17:00:00Z')).current.length,1);
 // Winter uses UTC rather than the summer UTC+1 offset.
 assert.equal(getHeroSchedule(data,'fitness',new Date('2026-12-17T18:15:00Z')).current.length,1);
});

test('cancelled and expired classes are skipped; future validity and once-only dates are respected',()=>{
 const data=catalog([
  session({cancelledDates:['2026-09-17','2026-09-24']}),
  session({id:'expired',time:'19:00',endDate:'2026-09-16'}),
  session({id:'future',time:'10:00',startDate:'2027-09-01'}),
  session({id:'once',recurrence:'once',date:'2026-09-19',time:'09:00'})
 ]);
 const result=getHeroSchedule(data,'fitness',new Date('2026-09-17T17:15:00Z'));
 assert.equal(result.current.length,0);
 assert.equal(result.next[0].session.id,'once');
 const recurring=getHeroSchedule(catalog([data.sessions[0]]),'fitness',new Date('2026-09-17T17:15:00Z'));
 assert.equal(recurring.next[0].date,'2026-10-01');
 const future=getHeroSchedule(catalog([data.sessions[2]]),'fitness',new Date('2026-09-17T17:15:00Z'));
 assert.equal(future.next[0].date,'2027-09-02');
 const cancelled=getHeroSchedule(catalog([session({recurrence:'once',date:'2026-09-19',cancelledDates:['2026-09-19']})]),'fitness');
 assert.equal(cancelled.next.length,0);
});

test('areas stay separate, unpublished records stay hidden and concurrent classes are all included',()=>{
 const data=catalog([session(),session({id:'ballet',modalityId:'dance',time:'19:00',duration:null}),session({id:'second',time:'19:00'}),session({id:'draft',published:false,time:'18:30'})]);
 const now=new Date('2026-09-17T17:15:00Z');
 assert.equal(getHeroSchedule(data,'fitness',now).next.length,1);
 assert.equal(getHeroSchedule(data,'dance',now).next[0].modality.name,'Ballet');
 assert.equal(getHeroSchedule(data,'all',now).next.length,2);
 assert.equal(getHeroSchedule(data,'wellness',now).hasSchedule,false);
 data.modalities[0]={...fitness,published:false};
 assert.equal(getHeroSchedule(data,'fitness',now).current.length,0);
 assert.equal(getHeroSchedule(data,'fitness',now).next.length,0);
});

test('unknown durations never imply an ongoing class, and midnight changes the Portuguese date',()=>{
 const data=catalog([session({modalityId:'dance',duration:null})]);
 const result=getHeroSchedule(data,'dance',new Date('2026-09-17T17:15:00Z'));
 assert.equal(result.current.length,0);
 assert.equal(result.next[0].date,'2026-09-24');
 const midnight=getHeroSchedule(catalog([session({weekday:5,time:'00:15',duration:30})]),'fitness',new Date('2026-09-17T23:20:00Z'));
 assert.equal(midnight.today,'2026-09-18');
 assert.equal(midnight.current.length,1);
});
