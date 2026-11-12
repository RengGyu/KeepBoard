import type {Player} from '../shared/types';
import {PlayerPiece} from './ui';
export function OwnerColors({ players, value, onChange, label = '소유색', game }: { label?: string; game?: string; players: Player[]; value: string | null | undefined; onChange: (ownerId: string | null) => void }) {
  return <fieldset className="se-owner-colors"><legend>{label}</legend><div>
    <button type="button" aria-pressed={value === null} className={value === null ? 'selected' : ''} onClick={() => onChange(null)}><i className="se-color-dot"/>모름</button>
    {players.map(player => <button type="button" key={player.id} aria-pressed={value === player.id} className={value === player.id ? 'selected' : ''} onClick={() => onChange(player.id)}><PlayerPiece color={player.color} game={game} size={22}/>{player.name}</button>)}
  </div></fieldset>;
}
