'use client';
import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ActionButton({label,icon:Icon,showLabel=false,...props}:{
  label:string;icon:LucideIcon;showLabel?:boolean;
}&Omit<ComponentProps<typeof Button>,'children'|'size'|'className'>){
  return <Button {...props} size={showLabel?'default':'icon'} className={showLabel?'min-h-11':'size-11 p-0'} aria-label={label} title={label}>
    <Icon className="size-4" aria-hidden="true"/>
    {showLabel&&<span>{label}</span>}
  </Button>;
}
