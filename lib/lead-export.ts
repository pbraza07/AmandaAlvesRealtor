import { orderedLeadFields } from './form-fields';
type ExportLead = Record<string, unknown> & {details: unknown};
const value = (v: unknown): string => v == null ? '' : v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v);
const cell = (v: unknown) => { const text=value(v); return `"${(/^[\s]*[=+@-]/.test(text)?"'"+text:text).replaceAll('"','""')}"`; };
export function exportLeadsCsv(leads: ExportLead[]) {
 const labels=[...new Set([...orderedLeadFields({type:'BUYER'}),...orderedLeadFields({type:'SELLER'})].map(([label])=>label))];
 const keys=[...new Set(leads.flatMap(l=>Object.keys(l.details as Record<string,unknown>||{})))].sort();
 const headers=['ID','Type','Status','Priority','Follow-up','Created','Updated','Archived',...labels,...keys.map(k=>`Details: ${k}`)];
 const lines=leads.map(l=>{const fields=Object.fromEntries(orderedLeadFields(l));const d=l.details as Record<string,unknown>||{};return [l.id,l.type,l.status,l.priority,l.followUpAt,l.createdAt,l.updatedAt,l.archivedAt,...labels.map(label=>fields[label]??''),...keys.map(k=>d[k])].map(cell).join(',')});
 return '\uFEFF'+[headers.map(cell).join(','),...lines].join('\r\n');
}
