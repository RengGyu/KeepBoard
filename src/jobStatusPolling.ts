import {isHostedReader} from '../shared/lightweightRecognition';
import {activeAnalysisJob,type AnalysisJob} from '../shared/analysisJobs';

const MAX_AUTO_CHECKS = 10;

export function createJobStatusPolling(options: {
  read: () => Promise<AnalysisJob | null>;
  onJob: (job: AnalysisJob | null) => void;
  onCompleted: (job: AnalysisJob) => Promise<void>;
  onError: (reason: 'request-failed' | 'auto-limit') => void;
  visible: () => boolean;
  subscribeVisibility: (change: () => void) => () => void;
  schedule: (check: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel: (timer: ReturnType<typeof setTimeout>) => void;
}) {
  let stopped = false, inFlight = false, failed = false, generation = 0, autoChecks = 0, unchangedChecks = 0;
  let current: AnalysisJob | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | undefined;
  const completed = new Set<string>();
  const clear = () => { if (timer !== undefined) options.cancel(timer); timer = undefined; };
  const schedule = () => {
    clear();
    if (!stopped && !failed && options.visible() && current && activeAnalysisJob(current)) {
      if (autoChecks >= (isHostedReader(current?.reader)?140:MAX_AUTO_CHECKS)) { failed = true; options.onError('auto-limit'); return; }
      if(current.createdAt&&Date.now()-Date.parse(current.createdAt)>300000){failed=true;options.onError('auto-limit');return;}
      const fast=isHostedReader(current.reader);
      const limit=fast?140:MAX_AUTO_CHECKS;
      if(autoChecks>=limit){failed=true;options.onError('auto-limit');return;}
      // Keep newly arriving results responsive; quiet jobs need fewer repeated reads.
      const delay = fast?(unchangedChecks<5?1000:unchangedChecks<10?2000:5000):[10000, 20000, 30000][Math.min(autoChecks, 2)];
      timer = options.schedule(() => { timer = undefined; void check(); }, delay);
    }
  };
  const accept = (job: AnalysisJob | null) => {
    if (stopped) return;
    generation++;
    failed = false;
    if (current?.id !== job?.id) autoChecks = 0;
    const sameProgress=current?.id===job?.id&&current?.state===job?.state&&current?.updatedAt===job?.updatedAt&&current?.liveRows===job?.liveRows;
    unchangedChecks=sameProgress?unchangedChecks+1:0;
    current = job;
    options.onJob(job);
    if (job?.state === 'completed' && !completed.has(job.id)) {
      completed.add(job.id);
      void options.onCompleted(job).catch(() => { if (stopped||current?.id!==job.id) return; completed.delete(job.id); failed = true; options.onError('request-failed'); });
    }
    schedule();
  };
  async function check(manual = false) {
    if (stopped || inFlight || !options.visible()) return;
    if (!manual && current && activeAnalysisJob(current)) {
      if (autoChecks >= (isHostedReader(current?.reader)?140:MAX_AUTO_CHECKS)) { failed = true; clear(); options.onError('auto-limit'); return; }
      autoChecks++;
    }
    clear();
    inFlight = true;
    const startedAt = generation;
    try {
      const job = await options.read();
      if (!stopped && startedAt === generation && options.visible()) accept(job);
    } catch {
      if (!stopped && startedAt === generation) { failed = true; clear(); options.onError('request-failed'); }
    } finally {
      inFlight = false;
      // A newly started job can supersede a slow discovery read. Keep its timer alive.
      if (!stopped && startedAt !== generation && timer === undefined && current && activeAnalysisJob(current)) schedule();
    }
  }
  return {
    start() {
      unsubscribe = options.subscribeVisibility(() => {
        if (!options.visible()) clear();
        else if (!failed && current && activeAnalysisJob(current)) void check();
        else if (current === null && generation === 0) void check();
      });
      if (options.visible()) void check();
    },
    accept,
    refresh() { failed = false; void check(true); },
    stop() { stopped = true; generation++; clear(); unsubscribe?.(); },
  };
}
