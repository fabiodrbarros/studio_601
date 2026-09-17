'use client';
import { Plus,Pencil,Trash2 } from 'lucide-react';
import ActionButton from './action-button';
import type { Catalog } from '@/lib/catalog';

const days=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
type Session=Catalog['sessions'][number];

export default function SessionGroups({modalities,sessions,professionals,onAdd,onEdit,onRemove,busy}: {
  modalities: Catalog['modalities']; sessions: Session[]; professionals: Catalog['professionals'];
  onAdd:(modalityId:string)=>void; onEdit:(session:Session)=>void; onRemove:(session:Session)=>void; busy:boolean;
}) {
  return <div className="divide-y">{modalities.map(m=>{
    const times=sessions.filter(s=>s.modalityId===m.id).sort((a,b)=>
      a.recurrence.localeCompare(b.recurrence)||(a.recurrence==='weekly'?((a.weekday+6)%7)-((b.weekday+6)%7):a.date.localeCompare(b.date))||a.time.localeCompare(b.time));
    return <section key={m.id} data-schedule-modality={m.id} className="py-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-medium">{m.name}</h3>
        <ActionButton showLabel label="Adicionar horário" icon={Plus} variant="outline" disabled={busy} onClick={()=>onAdd(m.id)}/>
      </div>
      {!times.length?<p className="text-sm text-muted-foreground">Sem horários.</p>:<div className="divide-y">{times.map(s=>{
        const professional=professionals.find(p=>p.id===s.professionalId);
        return <div key={s.id} data-schedule-session={s.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{s.recurrence==='weekly'?days[s.weekday]:s.date} · {s.time}{s.duration!=null?' · '+s.duration+' min':''}</p>
            {(professional||s.room)&&<p className="text-sm text-muted-foreground mt-1">{[professional?.name,s.room].filter(Boolean).join(' · ')}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs rounded-full px-3 py-1 ${s.published?'bg-secondary text-secondary-foreground':'bg-neutral-100'}`}>{s.published?'Publicado':'Rascunho'}</span>
            <ActionButton label="Editar" icon={Pencil} variant="outline" disabled={busy} onClick={()=>onEdit(s)}/>
            <ActionButton label="Eliminar" icon={Trash2} variant="ghost" disabled={busy} onClick={()=>onRemove(s)}/>
          </div>
        </div>;
      })}</div>}
    </section>;
  })}</div>;
}
