/** New optional readout contract; original GamePack and GenericRecord versions do not change. */
export type FieldBasis = 'observation' | 'user';
export interface SymbolValue { symbol: string; value: number | null }
export interface LocalFeature { id: string; kind: 'city'|'road'|'field'|'monastery'|'other'|null; label: string; x: number|null; y: number|null }
export interface PieceReference { pieceId: string; featureId: string|null }
export type DetailValue = string|number|boolean|null|SymbolValue[]|LocalFeature[]|PieceReference;
export interface PropertySpec {
 id:string; label:string; type:'text'|'integer'|'enum'|'boolean'|'marks'|'features'|'reference'|'player';
 acquisition:'visible'|'manual'; unit?:string; min?:number; max?:number;
 options?:readonly {value:string|number;label:string}[]; faceOnly?:boolean;
 targetComponents?:readonly string[]; sourceText:string;
}
export interface ComponentSpec { id:string; name:string; kind:string; description:string; fields:readonly PropertySpec[] }
export interface GameReadoutDefinition {
 gameId:string; runtimePackId:string; schema:string; editionId:string; sourceSHA:string; packVersion:string;
 title:string; batch:string; sourceVerification:'official-partial'|'attachment-only';
 components:readonly ComponentSpec[];
}
/** Runtime view. Generated unions provide the game/component-specific compile-time counterpart. */
export interface GameReadout {
 schema:string; kind:string|null; values:Record<string,DetailValue>; sources:Record<string,FieldBasis|null>;
}
export interface ReadoutContext { playerIds?:readonly string[]; mode?:'manual'|'ai' }
