import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, ChevronLeft, RotateCcw } from 'lucide-react';
import { api } from '@/api/client';
import type { Exchange } from '@/api/types';
import { ago, dateTime } from '@/lib/format';
import { INTERVIEW_LABEL } from '@/lib/labels';
import { useRetry } from '@/lib/useRetry';
import { Banner, Bar, Button, Card, Chip, ErrorState, PageHeader, ScoreChip, Skeleton, UserCell, cx } from '@/components/ui';

export default function InterviewDetail() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['interview', id], queryFn: () => api.interview(id) });
  const { retry, jobs } = useRetry();
  if (q.isLoading) return <><Skeleton className="h-16 w-80" /><Skeleton className="h-64" /></>;
  if (q.isError) return <Card><ErrorState what="this interview" onRetry={() => q.refetch()} /></Card>;
  const i = q.data!;
  const rep = i.report;
  const retrying = jobs?.some((j) => j.id === i.id && j.state === 'retrying');

  return (
    <>
      <Link to="/interviews" className="-mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink"><ChevronLeft className="h-4 w-4" />Mock interviews</Link>
      <PageHeader title={<span className="flex items-center gap-3">{i.target_role ?? 'Interview'}<Chip tone={INTERVIEW_LABEL[i.status][1]}>{INTERVIEW_LABEL[i.status][0]}</Chip></span>}
        sub={<span className="capitalize">{i.level} · started {dateTime(i.created_at)} · {i.questions_asked} of {i.question_budget} questions</span>}
        actions={<Link to={`/users/${i.user.id}`}><UserCell name={i.user.full_name} sub="Open user" /></Link>} />

      {i.status === 'fail' && (
        <Banner tone="red" icon={<AlertTriangle className="h-4 w-4" />} title={`The report couldn't be made · try ${i.attempts} of 3`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><span>{i.error} The answers are saved, so a retry only rebuilds the report.</span>
            {retrying ? <Chip tone="blue">Retrying…</Chip> : i.attempts < 3 ? <Button size="sm" onClick={() => retry('interview_report', i.id, i.user.full_name)}><RotateCcw className="h-3.5 w-3.5" />Retry report</Button> : <span className="font-medium">All tries used. Needs a developer.</span>}</div>
        </Banner>
      )}
      {i.status === 'in_progress' && <Banner tone="blue" title="Still going">Last answer {ago(i.last_activity_at)}. The report appears when they finish.</Banner>}
      {i.status === 'abandoned' && <Banner tone="grey" title="They left early">They stopped after {i.questions_asked} of {i.question_budget} questions, so there's no report.</Banner>}

      {rep && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.3fr]">
          <Card title="Report">
            <div className="flex flex-col gap-4 text-[13.5px]">
              <div className="flex items-center gap-3"><span className="text-[36px] font-bold leading-none">{rep.overall_score}</span><span className="text-ink-3">out of 100</span></div>
              <p className="text-ink-2">{rep.overall_summary}</p>
              {rep.dimensions.map((d) => (
                <div key={d.name}><div className="mb-1 flex justify-between text-[12.5px]"><span>{d.name}</span><span className="text-ink-3">{d.score}</span></div><Bar value={d.score / 100} tone={d.score >= 70 ? 'good' : d.score >= 45 ? 'warn' : 'bad'} /><div className="mt-1 text-[12px] text-ink-3">{d.note}</div></div>
              ))}
              <div><div className="mb-1 font-semibold">Strengths</div><ul className="list-disc space-y-1 pl-5 text-ink-2">{rep.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>
              <div><div className="mb-1 font-semibold">Work on</div><ul className="list-disc space-y-1 pl-5 text-ink-2">{rep.focus_areas.map((s) => <li key={s}>{s}</li>)}</ul></div>
            </div>
          </Card>
          <Questions exchanges={i.exchanges} scores={Object.fromEntries(rep.question_breakdown.map((x) => [x.sequence, x.score]))} />
        </div>
      )}
      {!rep && i.exchanges.length > 0 && <Questions exchanges={i.exchanges} scores={{}} />}
      {i.jd_text && <Card title="Job description they used"><p className="whitespace-pre-wrap text-[13px] text-ink-2">{i.jd_text}</p></Card>}
    </>
  );
}

function Questions({ exchanges, scores }: { exchanges: Exchange[]; scores: Record<number, number> }) {
  const [open, setOpen] = useState<string | null>(exchanges[0]?.id ?? null);
  return (
    <Card flush title="Questions and answers" sub={`${exchanges.length} asked`}>
      {exchanges.map((e) => (
        <div key={e.id} className="border-b border-line last:border-0">
          <button className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-canvas" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
            <span className="mt-0.5 w-5 text-[12px] font-semibold text-ink-4">{e.sequence}</span>
            <span className="flex-1"><span className="block text-[13.5px] font-medium">{e.question}</span><span className="text-[12px] text-ink-3">{e.topic} · {e.question_type === 'recall' ? 'Concept' : 'Applied'}</span></span>
            <ScoreChip v={scores[e.sequence]} />
            <ChevronDown className={cx('mt-0.5 h-4 w-4 text-ink-4 transition-transform', open === e.id && 'rotate-180')} />
          </button>
          {open === e.id && (
            <div className="flex flex-col gap-2.5 px-5 pb-4 pl-[52px] text-[13px]">
              <div className="rounded-[10px] bg-canvas p-3 text-ink-2">{e.answer ?? <span className="italic text-ink-4">No answer</span>}</div>
              {e.verdict && <>
                <div><Chip tone={e.verdict.tier === 'strong' ? 'green' : e.verdict.tier === 'partial' ? 'amber' : 'red'}>{e.verdict.tier[0].toUpperCase() + e.verdict.tier.slice(1)} answer</Chip></div>
                {e.verdict.covered.length > 0 && <div><span className="font-medium text-good">Covered: </span>{e.verdict.covered.join(', ')}</div>}
                {e.verdict.missed.length > 0 && <div><span className="font-medium text-bad">Missed: </span>{e.verdict.missed.join(', ')}</div>}
              </>}
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}
