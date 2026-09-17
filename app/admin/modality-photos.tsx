'use client';
import type { Catalog } from '@/lib/catalog';
import PhotoField from './photo-field';

export default function ModalityPhotos({modalities,disabled,onBusy,onChange}:{
  modalities:Catalog['modalities'];disabled:boolean;
  onBusy:(value:boolean)=>void;onChange:(id:string,image:string)=>void;
}){
  return <section className="space-y-5" aria-labelledby="modality-photos-title">
    <h3 id="modality-photos-title" className="text-xl">Fotografias das modalidades e serviços</h3>
    <div className="grid md:grid-cols-2 gap-6">{modalities.map(m=><PhotoField key={m.id}
      id={'modality-photo-'+m.id} label={'Fotografia de '+m.name} value={m.image}
      disabled={disabled} onBusy={onBusy} onChange={image=>onChange(m.id,image)}/>)}</div>
    {!modalities.length&&<p className="text-sm">Sem modalidades.</p>}
  </section>;
}
