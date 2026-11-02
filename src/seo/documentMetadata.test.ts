import { describe, expect, it } from 'vitest'
import { getCanonicalUrl, getNetlifyRouteRedirects, getPageMetadata, getSitemapPages } from './publicPageMetadata'
import { renderMetadataTags, renderPageHtml } from './documentMetadata'
import { calculators } from '../features/calculators/catalog'

const template = '<!doctype html><html lang="pt-BR"><head><title>Old title</title><meta name="description" content="Old description"></head><body></body></html>'

describe('public page metadata', () => {
  it.each([
    ['/', 'PlantãoMed — Plataforma Médica'],
    ['/protocolos', 'Biblioteca Clínica | PlantãoMed'],
    ['/calculadoras', 'Calculadoras Médicas | PlantãoMed'],
    ['/medicamentos', 'Medicamentos | PlantãoMed'],
    ['/protocolos/asma-aguda', 'Asma aguda | PlantãoMed'],
    ['/calculadoras/qsofa', 'Quick SOFA | PlantãoMed'],
  ])('provides metadata and canonical URL for %s', (pathname, title) => {
    const metadata = getPageMetadata(pathname)
    expect(metadata.title).toBe(title)
    expect(getCanonicalUrl(pathname)).toBe(`https://plantaomeds.netlify.app${pathname === '/' ? '/' : pathname}`)
    expect(metadata.description.length).toBeGreaterThan(20)
  })

  it.each(['/login', '/assistente-clinico', '/aceitar-convite', '/redefinir-senha', '/favoritos', '/historico'])(
    'marks the protected or private route %s as noindex',
    (pathname) => expect(getPageMetadata(pathname).noIndex).toBe(true),
  )

  it('excludes private routes from the sitemap', () => {
    expect(getSitemapPages().some(({ path }) => ['/login', '/assistente-clinico', '/favoritos'].includes(path))).toBe(false)
  })

  it('covers every calculator using its current name and purpose', () => {
    calculators.forEach((calculator) => {
      const metadata = getPageMetadata(`/calculadoras/${calculator.id}`)
      expect(metadata.title).toBe(`${calculator.name} | PlantãoMed`)
      expect(metadata.description).toContain(calculator.purpose)
    })
  })

  it('rewrites known routes to their own static HTML before the SPA fallback', () => {
    const redirects = getNetlifyRouteRedirects()
    expect(redirects).toContain('/protocolos/asma-aguda /protocolos/asma-aguda/index.html 200')
    expect(redirects).toContain('/protocolos/asma-aguda/ /protocolos/asma-aguda/index.html 200')
    expect(redirects).toContain('/calculadoras/qsofa /calculadoras/qsofa/index.html 200')
    expect(redirects).toContain('/assistente-clinico /assistente-clinico/index.html 200')
    expect(redirects.at(-1)).toBe('/* /index.html 200')
  })
})

describe('renderPageHtml', () => {
  it('writes unique page-specific crawler metadata into the initial HTML', () => {
    const html = renderPageHtml(template, getPageMetadata('/calculadoras/qsofa'))
    expect(html).toContain('<title>Quick SOFA | PlantãoMed</title>')
    expect(html).toContain('property="og:url" content="https://plantaomeds.netlify.app/calculadoras/qsofa"')
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).toContain('property="og:image:width" content="1200"')
    expect(html.match(/property="og:title"/g)).toHaveLength(1)
    expect(html.match(/rel="canonical"/g)).toHaveLength(1)
    expect(html).not.toContain('Old title')
  })

  it('escapes content and marks unapproved protocol pages noindex without asserting clinical advice', () => {
    const page = getPageMetadata('/protocolos/asma-aguda')
    const tags = renderMetadataTags(page)
    expect(page.noIndex).toBe(true)
    expect(tags).toContain('name="robots" content="noindex, nofollow"')
    expect(tags).toContain('Conteúdo ainda não validado para uso assistencial.')
  })
})
