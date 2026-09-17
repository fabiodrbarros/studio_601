import type { Catalog } from './catalog';

// Editing a person preserves all existing service and session records.
export function updateMember(data: Catalog, member: Catalog['professionals'][number]): Catalog {
  return {
    ...data,
    professionals: data.professionals.some(p => p.id === member.id)
      ? data.professionals.map(p => p.id === member.id ? member : p)
      : [...data.professionals, member],
  };
}
