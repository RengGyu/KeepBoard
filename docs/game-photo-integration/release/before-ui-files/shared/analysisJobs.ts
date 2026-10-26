export type AnalysisJobState='queued'|'running'|'completed'|'failed'|'stale'|'interrupted';
export interface AnalysisJob {id:string;sessionId:string;ownerId?:string;evidenceIds:string[];captureEpoch:string;state:AnalysisJobState;createdAt:string;updatedAt:string;candidateCount?:number;mode?:'live'|'manual'|'example';timings?:Record<string,number>;error?:'analysis-failed'|'stale'|'interrupted'}
export const activeAnalysisJob=(j:AnalysisJob)=>j.state==='queued'||j.state==='running';
