'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function PhotoField({ id, label, value, fallback, onChange, onBusy, disabled }: {
  id: string; label: string; value?: string; fallback?: string;
  onChange: (value: string) => void; onBusy: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false), [error, setError] = useState('');
  return <div className="min-w-0 space-y-3"><Label htmlFor={id}>{label}</Label>
    {(value || fallback) && <img src={value || fallback} alt={label} className="h-36 w-full max-w-sm rounded-xl object-cover"/>}
    <Input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || disabled} onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { setError('A fotografia deve ter até 10 MB.'); return; }
      setError(''); setUploading(true); onBusy(true);
      try {
        const response = await fetch('/api/media', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        const result = await response.json() as { error?: string; url: string };
        if (!response.ok) throw Error(result.error);
        onChange(result.url);
      } catch (error) { setError((error as Error).message); }
      finally { setUploading(false); onBusy(false); }
    }}/>
    {uploading && <p role="status" className="text-sm">A carregar fotografia…</p>}
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {value && <Button type="button" variant="outline" disabled={uploading || disabled} onClick={() => onChange('')}>{fallback?'Repor fotografia original':'Remover fotografia'}</Button>}
  </div>;
}
