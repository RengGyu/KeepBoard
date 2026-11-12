import type {HostedReaderSelection} from './lightweightRecognition';
/** Optional persistence extension. No queue, provider retry, quality approval or hidden owner assignment. */
export interface SaveIntent {version:'save-intent-v1';id:string;requestId:string;scopeKey:string;captureEpoch:string;packVersion:string;sourceSHA:string;definitionSHA:string;reader:HostedReaderSelection;evidenceIds:string[];signature:string;createdAt:string;jobId?:string;completionSnapshotId?:string}
