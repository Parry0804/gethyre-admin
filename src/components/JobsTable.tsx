import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import type { FailedJob } from '@/api/types';
import { ago, JOB_LABEL } from '@/lib/format';
import { Button, Chip, Empty, Table, Td, Tr, UserCell } from './ui';

const KIND_TONE = { resume: 'blue', interview_report: 'amber', career_plan: 'grey' } as const;

/** Failed and stuck background jobs, with a Retry button on each. */
export function JobsTable({ jobs, onRetry }: { jobs: FailedJob[]; onRetry: (j: FailedJob) => void }) {
  const nav = useNavigate();
  const open = (j: FailedJob) => (j.kind === 'resume' ? nav(`/resumes?open=${j.id}`) : j.kind === 'interview_report' ? nav(`/interviews/${j.id}`) : nav(`/users/${j.user.id}`));
  return (
    <Table head={[{ label: 'What failed' }, { label: 'User' }, { label: 'Reason' }, { label: 'When' }, { label: '', className: 'text-right' }]}
      empty={<Empty icon={<CheckCircle2 className="h-5 w-5 text-good" />} title="No failed or stuck jobs" sub="Everything is running. New failures will show up here." />}>
      {jobs.map((j) => (
        <Tr key={j.id} onClick={() => open(j)}>
          <Td><Chip tone={KIND_TONE[j.kind]}>{JOB_LABEL[j.kind]}</Chip></Td>
          <Td><UserCell name={j.user.full_name} /></Td>
          <Td className="min-w-[260px]">
            <div className="text-[13px] text-ink-2">{j.reason}</div>
            <div className={j.state === 'limit' ? 'text-xs font-medium text-bad' : j.state === 'stuck' ? 'text-xs font-medium text-warn' : 'text-xs text-ink-3'}>
              {j.state === 'stuck' ? 'Stuck, never finished' : j.state === 'limit' ? `Try ${j.attempts} of ${j.max_attempts} · retries used up` : `Try ${j.attempts} of ${j.max_attempts}`}
            </div>
          </Td>
          <Td className="whitespace-nowrap text-ink-2">{ago(j.since)}</Td>
          <Td className="text-right">
            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              {j.state === 'retrying' && <Chip tone="blue">Retrying…</Chip>}
              {j.state === 'limit' && <Chip tone="red">Needs a developer</Chip>}
              {j.state === 'stuck' && <Chip tone="amber">Stuck</Chip>}
              {(j.state === 'failed' || j.state === 'stuck') && <Button size="sm" onClick={() => onRetry(j)}>Retry</Button>}
            </div>
          </Td>
        </Tr>
      ))}
    </Table>
  );
}
