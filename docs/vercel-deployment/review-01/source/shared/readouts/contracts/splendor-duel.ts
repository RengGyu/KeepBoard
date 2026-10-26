// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type SplendorDuelReadout =
  {schema:"splendor-duel-v1";kind:"tokens";values:{"observedColor": string | null; "tokenType": string | null; "tokenZone": string | null; "cell": string | null};sources:{"observedColor": FieldBasis | null; "tokenType": FieldBasis | null; "tokenZone": 'user' | null; "cell": 'user' | null}}
 | {schema:"splendor-duel-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "level": number | null; "bonusType": string | null; "crowns": number | null; "printedPoints": number | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "level": FieldBasis | null; "bonusType": FieldBasis | null; "crowns": FieldBasis | null; "printedPoints": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"splendor-duel-v1";kind:"privileges";values:{"observedColor": string | null; "privilegeZone": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "privilegeZone": 'user' | null; "owner": 'user' | null}}
 | {schema:"splendor-duel-v1";kind:null;values:{};sources:{}};
