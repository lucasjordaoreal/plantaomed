import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPageMetadata } from './publicPageMetadata'
import { renderMetadataTags } from './documentMetadata'

export function usePageMetadata(): void {
  const { pathname } = useLocation()

  useEffect(() => {
    const page = getPageMetadata(pathname)
    document.title = page.title

    const parsedTags = new DOMParser().parseFromString(`<head>${renderMetadataTags(page)}</head>`, 'text/html').head
    document.head
      .querySelectorAll('meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]')
      .forEach((tag) => tag.remove())
    parsedTags.querySelectorAll('meta, link[rel="canonical"]').forEach((tag) => document.head.append(tag.cloneNode(true)))
  }, [pathname])
}
