import { ArrowRight, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProtocolCard } from '../components/ProtocolCard'
import { useLibraryState } from '../app/useLibraryState'
import { protocols } from '../data/protocols'

export function FavoritesPage() {
  const { favorites, toggleFavoriteId } = useLibraryState()
  const favoriteProtocols = favorites
    .map((id) => protocols.find((protocol) => protocol.id === id))
    .filter((protocol): protocol is (typeof protocols)[number] => Boolean(protocol))

  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow"><Heart size={14} aria-hidden="true" /> Acesso pessoal</span>
        <h1 data-page-heading tabIndex={-1}>Favoritos</h1>
        <p>Registros salvos neste dispositivo.</p>
      </header>
      {favoriteProtocols.length ? (
        <section className="saved-list favorites-list" aria-label="Protocolos favoritos">
          {favoriteProtocols.map((protocol) => (
            <ProtocolCard key={protocol.id} protocol={protocol} favorite onToggleFavorite={toggleFavoriteId} />
          ))}
        </section>
      ) : (
        <section className="empty-page-state">
          <Heart size={24} aria-hidden="true" />
          <h2>Nenhum favorito salvo</h2>
          <p>Salve temas na Biblioteca para encontrá-los rapidamente aqui.</p>
          <Link className="action-button" to="/protocolos">Explorar Biblioteca <ArrowRight size={15} aria-hidden="true" /></Link>
        </section>
      )}
    </div>
  )
}
