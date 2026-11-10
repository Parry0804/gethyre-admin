import type { InterviewStatus } from '@/api/types';
import type { Tone } from '@/components/ui';

export const INTERVIEW_LABEL: Record<InterviewStatus, [string, Tone]> = {
  complete: ['Finished', 'green'], in_progress: ['In progress', 'blue'], fail: ['Report failed', 'red'], abandoned: ['Left early', 'grey'],
  not_started: ['Not started', 'grey'], preparing: ['Preparing', 'blue'], ready_for_interview: ['Ready', 'blue'],
};
