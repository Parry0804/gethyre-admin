import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import type { FailedJob, JobKind } from '@/api/types';
import { useToast } from '@/components/ui';
import { JOB_LABEL } from './format';

/** The overview query, polled every 1.5 s while any job is retrying. Shared by every page that retries jobs. */
export const useOverview = (watching = false) =>
  useQuery({ queryKey: ['overview'], queryFn: api.overview, refetchInterval: (q) => (watching || q.state.data?.failed_jobs.some((j) => j.state === 'retrying') ? 1500 : false) });

/** Starts retries and reports how each one ended (worked / failed again). Usable on any page. */
export function useRetry() {
  const qc = useQueryClient();
  const toast = useToast();
  const watching = useRef(new Map<string, { kind: JobKind; who: string }>());
  const [count, setCount] = useState(0);
  const ov = useOverview(count > 0);
  const jobs = ov.data?.failed_jobs;

  const refresh = () => ['overview', 'user', 'resumes', 'resume', 'interviews', 'interview'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const watch = (id: string, kind: JobKind, who: string) => { watching.current.set(id, { kind, who }); setCount(watching.current.size); };

  const one = useMutation({
    mutationFn: ({ kind, id }: { kind: JobKind; id: string; who: string }) => api.retryJob(kind, id),
    onSuccess: (_d, v) => { watch(v.id, v.kind, v.who); toast({ tone: 'info', title: 'Retry started', body: `${v.who}'s ${JOB_LABEL[v.kind].toLowerCase()} is running again. This usually takes under a minute.` }); refresh(); },
    onError: (e) => toast({ tone: 'error', title: "Couldn't retry", body: e instanceof ApiError && e.status === 409 ? 'All 3 tries are used up. This one needs a developer.' : 'The server did not answer. Try again.' }),
  });
  const all = useMutation({
    mutationFn: () => api.retryAll(),
    onSuccess: (d) => { (jobs ?? []).filter((j) => j.state === 'failed' || j.state === 'stuck').forEach((j) => watch(j.id, j.kind, j.user.full_name?.split(' ')[0] ?? 'User')); toast({ tone: 'info', title: `Retrying ${d.queued} jobs`, body: 'Results show up as each one finishes.' }); refresh(); },
    onError: () => toast({ tone: 'error', title: "Couldn't retry", body: 'The server did not answer. Try again.' }),
  });

  useEffect(() => {
    if (!jobs || ov.isFetching) return;
    let changed = false;
    for (const [id, w] of watching.current) {
      const j: FailedJob | undefined = jobs.find((x) => x.id === id);
      if (j?.state === 'retrying') continue;
      watching.current.delete(id); changed = true;
      if (!j) toast({ tone: 'success', title: `${w.who}'s ${JOB_LABEL[w.kind].toLowerCase()} worked`, body: `${w.who} got a notification in the app.` });
      else toast({ tone: 'error', title: 'Retry failed again', body: `${j.reason} ${j.state === 'limit' ? 'All tries used up.' : `${j.max_attempts - j.attempts} ${j.max_attempts - j.attempts === 1 ? 'try' : 'tries'} left.`}` });
    }
    if (changed) { setCount(watching.current.size); refresh(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, ov.isFetching]);

  return { retry: (kind: JobKind, id: string, who: string | null | undefined) => one.mutate({ kind, id, who: who?.split(' ')[0] ?? 'User' }), retryAll: all.mutate, retryingAll: all.isPending, jobs, overview: ov };
}
