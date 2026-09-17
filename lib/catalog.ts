import { z } from 'zod';
const area=z.enum(['fitness','wellness','dance']);
const id=z.string().uuid();
const photo=z.string().regex(/^(?:|\/api\/media\/[a-f0-9-]{36}\.webp)$/, 'Fotografia inválida.').optional();
const areaPhotos=z.object({cardImage:photo,spaceImage:photo});
const provenance={source:z.string().max(160).optional(),importKey:z.string().max(160).optional(),importBaseline:z.string().max(4000).optional()};
const common={...provenance,id,name:z.string().trim().min(1).max(100),published:z.boolean()};
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s,'Data inválida');
const socialUrl=(hosts:string[])=>z.string().max(2000).refine(value=>{if(!value)return true;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&hosts.includes(u.hostname);}catch{return false;}},'Indica um link HTTPS da rede social correspondente.').optional();
export const schema=z.object({
 schemaVersion:z.literal(2).optional(),
 sitePhotos:z.object({spaceImage:photo,fitness:areaPhotos.optional(),wellness:areaPhotos.optional(),dance:areaPhotos.optional()}).optional(),
 modalities:z.array(z.object({...common,area,image:photo,description:z.string().max(2000),kind:z.enum(['group','pt','service']),mode:z.enum(['schedule','appointment','information']),sortOrder:z.number().int().min(1).max(10000).nullable().optional(),professionalIds:z.array(id).max(100).optional()})).max(200),
 professionals:z.array(z.object({...common,image:photo,areas:z.array(area).min(1).max(3),role:z.string().trim().max(100),bio:z.string().max(2000)})).max(100),
 sessions:z.array(z.object({...provenance,id,modalityId:id,professionalId:id.or(z.literal('')),room:z.string().trim().max(100),recurrence:z.enum(['weekly','once']),weekday:z.number().int().min(0).max(6),date:date.or(z.literal('')),startDate:date.or(z.literal('')),endDate:date.or(z.literal('')),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),duration:z.number().int().min(5).max(480).nullable(),ageMin:z.number().int().min(0).max(120).nullable().optional(),ageMax:z.number().int().min(0).max(120).nullable().optional(),accessNote:z.string().trim().max(300).optional(),cancelledDates:z.array(date).max(100),published:z.boolean()})).max(1000),
 contact:z.object({email:z.string().email().or(z.literal('')),phone:z.string().max(40),secondaryPhone:z.string().max(40).optional(),address:z.string().max(300),phoneNote:z.string().max(160).optional(),mapUrl:z.string().max(2000).refine(value=>{if(!value)return true;try{const u=new URL(value);return u.protocol==='https:'&&(['www.google.com','google.com','maps.google.com','www.google.pt','maps.app.goo.gl'].includes(u.hostname))&&(u.pathname.startsWith('/maps')||u.hostname.startsWith('maps.'));}catch{return false;}},'Indica um link HTTPS do Google Maps.').optional(),instagramUrl:socialUrl(['instagram.com','www.instagram.com']),facebookUrl:socialUrl(['facebook.com','www.facebook.com'])})
}).superRefine((d,ctx)=>{
 const fail=(m:string)=>ctx.addIssue({code:'custom',message:m});
 for(const list of [d.modalities,d.professionals,d.sessions]) if(new Set(list.map(x=>x.id)).size!==list.length)fail('Registos repetidos.');
 for(const m of d.modalities){if(m.area==='wellness'&&m.mode!=='appointment')fail('Wellness funciona sob marcação.');if(new Set(m.professionalIds||[]).size!==(m.professionalIds||[]).length)fail('Profissionais associados repetidos.');for(const professionalId of m.professionalIds||[]){const p=d.professionals.find(p=>p.id===professionalId);if(!p||!p.areas.includes(m.area))fail('Os profissionais do serviço devem existir e pertencer à mesma área.');}}
 for(const s of d.sessions){const m=d.modalities.find(m=>m.id===s.modalityId),p=d.professionals.find(p=>p.id===s.professionalId);if(!m||(s.professionalId&&!p))fail('A sessão precisa de modalidade existente e, se atribuído, profissional existente.');else {if(m.mode!=='schedule')fail('Serviços sob marcação não têm sessões fixas.');if(p&&!p.areas.includes(m.area))fail('O profissional não pertence à área da modalidade.');}if(s.recurrence==='once'&&!s.date)fail('Indica a data da sessão.');if(s.startDate&&s.endDate&&s.startDate>s.endDate)fail('O fim deve ser posterior ao início.');const [h,min]=s.time.split(':').map(Number);if(s.ageMin!=null&&s.ageMax!=null&&s.ageMin>s.ageMax)fail('A idade máxima deve ser igual ou superior à mínima.');if(s.duration!==null&&h*60+min+s.duration>1440)fail('A sessão deve terminar no mesmo dia.');}
});
export type Catalog=z.infer<typeof schema>;
export const empty:Catalog={modalities:[],professionals:[],sessions:[],contact:{email:'',phone:'',address:''}};
