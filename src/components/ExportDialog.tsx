import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { api } from '@/api/client';
import type { ExportFilters, ExportFormat } from '@/api/types';
import { n } from '@/lib/format';
import { Button, Dialog, DialogIcon, Switch, cx, useToast } from './ui';

export const FORMATS: Array<{ value: ExportFormat; name: string; ext: string; desc: string }> = [
  { value: 'xlsx', name: 'Excel', ext: '.xlsx', desc: 'One sheet for each kind of data. Best for sorting and sharing.' },
  { value: 'csv', name: 'CSV', ext: '.csv in a .zip', desc: 'One file for each kind of data. Opens anywhere.' },
  { value: 'pdf', name: 'PDF', ext: '.pdf', desc: 'A printable report. Best for up to 500 users.' },
  { value: 'json', name: 'JSON', ext: '.json', desc: 'Everything, nested as stored. For developers.' },
];

/** Quick export of the current Users list. */
export function ExportUsersDialog({ open, onClose, count, filters }: { open: boolean; onClose: () => void; count: number; filters: ExportFilters }) {
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [contacts, setContacts] = useState(true);
  const nav = useNavigate();
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => api.createExport({ data: ['users'], filters, format, include_contacts: contacts }),
    onSuccess: () => { onClose(); toast({ tone: 'info', title: 'Export started', body: `${n(count)} users. It shows under Recent exports when ready.` }); nav('/exports'); },
    onError: () => toast({ tone: 'error', title: "Couldn't start the export", body: 'The server did not answer. Try again.' }),
  });
  return (
    <Dialog open={open} onClose={onClose} icon={<DialogIcon tone="blue"><Download className="h-5 w-5" /></DialogIcon>} title={`Export ${n(count)} users`} sub="Exports this list with the filters you have on. For more data, use the Exports page."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Export</Button></>}>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Format">
        {FORMATS.map((f) => (
          <button key={f.value} role="radio" aria-checked={format === f.value} onClick={() => setFormat(f.value)} className={cx('flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left', format === f.value ? 'border-brand bg-brand-soft' : 'border-edge')}>
            <span className={cx('h-4 w-4 rounded-full border bg-white', format === f.value ? 'border-[5px] border-brand' : 'border-edge')} />
            <span className="text-[13.5px] font-semibold">{f.name}</span><span className="text-[12.5px] text-ink-3">{f.ext}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3"><Switch on={contacts} onChange={setContacts} label="Include phone numbers and emails" /><span className="text-[13.5px]">Include phone numbers and emails</span></div>
      <button className="self-start text-[13px] font-semibold text-brand" onClick={() => { onClose(); nav('/exports'); }}>More data or formats? Open Exports</button>
    </Dialog>
  );
}
