import { describe, expect, it } from 'vitest'
import { getCanonicalUrl, getNetlifyRouteRedirects, getPageMetadata, getRobotsTxt, getSitemapPages } from './publicPageMetadata'
import { renderMetadataTags, renderPageHtml } from './documentMetadata'
import { calculators } from '../features/calculators/catalog'

const template = '<!doctype html><html lang="pt-BR"><head><title>Old title</title><meta name="description" content="Old description"></head><body></body></html>'

describe('public page metadata', () => {
  it.each([
    ['/', 'PlantãoMed — Plataforma Clínica para Médicos'],
    ['/boas-vindas', 'PlantãoMed — Plataforma Clínica para Médicos'],
    ['/protocolos', 'Biblioteca Clínica | PlantãoMed'],
    ['/calculadoras', 'Calculadoras Médicas | PlantãoMed'],
    ['/medicamentos', 'Medicamentos | PlantãoMed'],
    ['/protocolos/asma-aguda', 'Asma aguda | PlantãoMed'],
    ['/calculadoras/qsofa', 'Quick SOFA | PlantãoMed'],
  ])('provides metadata and canonical URL for %s', (pathname, title) => {
    const metadata = getPageMetadata(pathname)
    expect(metadata.title).toBe(title)
    expect(getCanonicalUrl(pathname)).toBe(`https://plantaomeds.netlify.app${pathname === '/' || pathname === '/boas-vindas' ? '/' : pathname}`)
    expect(metadata.description.length).toBeGreaterThan(20)
  })

  it.each(['/login', '/assistente-clinico', '/aceitar-convite', '/redefinir-senha', '/favoritos', '/historico'])(
    'marks the protected or private route %s as noindex',
    (pathname) => expect(getPageMetadata(pathname).noIndex).toBe(true),
  )

  it.each(['/boas-vindas', '/inicio', '/protocolos', '/medicamentos', '/diretrizes', '/calculadoras', '/sinais-e-sintomas'])(
    'allows indexing of public route %s',
    (pathname) => expect(getPageMetadata(pathname).noIndex).not.toBe(true),
  )

  it('uses the institutional root as canonical for the welcome route', () => {
    const welcome = getPageMetadata('/boas-vindas')
    expect(welcome.canonicalPath).toBe('/')
    expect(getCanonicalUrl('/boas-vindas')).toBe('https://plantaomeds.netlify.app/')
    expect(getSitemapPages().some(({ path }) => path === '/boas-vindas')).toBe(false)
    expect(getSitemapPages().some(({ path }) => path === '/')).toBe(true)
  })

  it('excludes private routes from the sitemap and allows crawlers to read page policies', () => {
    expect(getSitemapPages().some(({ path }) => ['/login', '/assistente-clinico', '/favoritos', '/historico'].includes(path))).toBe(false)
    expect(getRobotsTxt()).toContain('Allow: /')
    expect(getRobotsTxt()).toContain('Sitemap: https://plantaomeds.netlify.app/sitemap.xml')
    expect(getRobotsTxt()).not.toContain('Disallow:')
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
    expect(redirects.indexOf('/ai-catalog.json /index.html 404')).toBeLessThan(redirects.indexOf('/* /index.html 200'))
    expect(redirects.indexOf('/llms.txt /index.html 404')).toBeLessThan(redirects.indexOf('/* /index.html 200'))
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

  it.each(['/', '/boas-vindas'])('renders indexable institutional metadata in the initial HTML for %s', (pathname) => {
    const html = renderPageHtml(template, getPageMetadata(pathname))
    expect(html).toContain('<title>PlantãoMed — Plataforma Clínica para Médicos</title>')
    expect(html).toContain('name="description" content="Conheça o PlantãoMed, uma plataforma clínica para médicos brasileiros com biblioteca de referências, diretrizes, medicamentos e calculadoras."')
    expect(html).toContain('name="robots" content="index, follow"')
    expect(html).toContain('property="og:locale" content="pt_BR"')
    expect(html).toContain('property="og:image" content="https://plantaomeds.netlify.app/social/plantao-med-og.jpg"')
    expect(html).toContain('property="og:url" content="https://plantaomeds.netlify.app/"')
    expect(html.match(/name="robots"/g)).toHaveLength(1)
    expect(html.match(/name="description"/g)).toHaveLength(1)
    expect(html.match(/rel="canonical"/g)).toHaveLength(1)
    expect(html).not.toContain('noindex')
    expect(html).not.toContain('nofollow')
  })

  it('retains noindex in the initial HTML for private routes', () => {
    const html = renderPageHtml(template, getPageMetadata('/favoritos'))
    expect(html).toContain('name="robots" content="noindex, nofollow"')
  })

  it('escapes content and marks unapproved protocol pages noindex without asserting clinical advice', () => {
    const page = getPageMetadata('/protocolos/asma-aguda')
    const tags = renderMetadataTags(page)
    expect(page.noIndex).toBe(true)
    expect(tags).toContain('name="robots" content="noindex, nofollow"')
    expect(tags).toContain('Conteúdo ainda não validado para uso assistencial.')
  })
})
