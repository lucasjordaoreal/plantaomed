import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { getPublicUrl } from '../config/publicSite'
import { getPageMetadata } from '../seo/publicPageMetadata'

export function SharePageButton() {
  const { pathname } = useLocation()
  const [message, setMessage] = useState('')
  const page = getPageMetadata(pathname)
  const url = getPublicUrl(page.path)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Link copiado.')
    } catch {
      const input = document.createElement('textarea')
      input.value = url
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.append(input)
      input.select()
      let copied = false
      try {
        copied = document.execCommand('copy')
      } catch {
        copied = false
      }
      input.remove()
      setMessage(copied ? 'Link copiado.' : 'Não foi possível copiar o link.')
    }
  }

  const sharePage = async () => {
    if (!navigator.share) {
      await copyLink()
      return
    }

    try {
      await navigator.share({ title: page.title, text: page.description, url })
      setMessage('Compartilhamento aberto.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      await copyLink()
    }
  }

  return (
    <span className="share-page">
      <button className="action-button" type="button" onClick={() => void sharePage()}>
        <Share2 size={16} aria-hidden="true" />
        Compartilhar
      </button>
      <span className="sr-only" aria-live="polite">{message}</span>
    </span>
  )
}
