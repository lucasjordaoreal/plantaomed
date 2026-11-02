import { Heart } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { Protocol } from '../types'

type Props = {
  protocol: Protocol
  favorite: boolean
  onToggleFavorite: (id: string) => void
  onOpen?: () => void
}

export function ProtocolCard({ protocol, favorite, onToggleFavorite, onOpen }: Props) {
  const location = useLocation()
  return (
    <article className="protocol-row">
      <Link
        className="protocol-row__select"
        to={`/protocolos/${protocol.id}`}
        state={{ from: `${location.pathname}${location.search}` }}
        onClick={onOpen}
      >
        <span className="protocol-row__title">{protocol.title}</span>
        <span className="protocol-row__meta">{protocol.category}</span>
      </Link>
      <button
        type="button"
        aria-label={`${favorite ? 'Remover dos' : 'Adicionar aos'} favoritos: ${protocol.title}`}
        aria-pressed={favorite}
        onClick={() => onToggleFavorite(protocol.id)}
        className={`icon-button favorite-button ${favorite ? 'is-favorite' : ''}`}
      >
        <Heart size={17} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </article>
  )
}
