import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const siteUrl = 'https://plantaomeds.netlify.app'
const publicPages = [
  ['', `${siteUrl}/`],
  ['boas-vindas', `${siteUrl}/`],
  ['inicio', `${siteUrl}/inicio`],
  ['protocolos', `${siteUrl}/protocolos`],
  ['medicamentos', `${siteUrl}/medicamentos`],
  ['diretrizes', `${siteUrl}/diretrizes`],
  ['calculadoras', `${siteUrl}/calculadoras`],
  ['sinais-e-sintomas', `${siteUrl}/sinais-e-sintomas`],
  ['sobre', `${siteUrl}/sobre`],
]
const privatePages = [
  'login',
  'recuperar-senha',
  'aceitar-convite',
  'redefinir-senha',
  'assistente-clinico',
  'favoritos',
  'historico',
]

function singleMatch(content, pattern, label) {
  const matches = [...content.matchAll(pattern)]
  if (matches.length !== 1) throw new Error(`Expected one ${label}; found ${matches.length}.`)
  return matches[0][1]
}

async function validatePage(route, canonical, robots) {
  const file = route
    ? path.join(dist, route, 'index.html')
    : path.join(dist, 'index.html')
  const html = await readFile(file, 'utf8')
  const title = singleMatch(html, /<title>(.*?)<\/title>/gi, `${route || '/'} title`)
  const description = singleMatch(html, /<meta name="description" content="([^"]*)"[^>]*>/gi, `${route || '/'} description`)
  const robotsContent = singleMatch(html, /<meta name="robots" content="([^"]*)"[^>]*>/gi, `${route || '/'} robots`)
  const canonicalUrl = singleMatch(html, /<link rel="canonical" href="([^"]*)"[^>]*>/gi, `${route || '/'} canonical`)
  const openGraphUrl = singleMatch(html, /<meta property="og:url" content="([^"]*)"[^>]*>/gi, `${route || '/'} Open Graph URL`)
  singleMatch(html, /<meta property="og:image" content="([^"]*)"[^>]*>/gi, `${route || '/'} Open Graph image`)
  singleMatch(html, /<meta property="og:locale" content="([^"]*)"[^>]*>/gi, `${route || '/'} Open Graph locale`)
  singleMatch(html, /<meta name="twitter:card" content="([^"]*)"[^>]*>/gi, `${route || '/'} X card`)

  if (!title.trim() || !description.trim()) throw new Error(`${route || '/'} is missing a title or description.`)
  if (robotsContent !== robots) throw new Error(`${route || '/'} has unexpected robots policy: ${robotsContent}.`)
  if (canonicalUrl !== canonical || openGraphUrl !== canonical) {
    throw new Error(`${route || '/'} has conflicting canonical or Open Graph URL.`)
  }
}

for (const [route, canonical] of publicPages) {
  await validatePage(route, canonical, 'index, follow')
}
for (const route of privatePages) {
  await validatePage(route, `${siteUrl}/${route}`, 'noindex, nofollow')
}

const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8')
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url)
if (!sitemapUrls.length) throw new Error('The sitemap contains no URLs.')
if (new Set(sitemapUrls).size !== sitemapUrls.length) throw new Error('The sitemap contains duplicate URLs.')
if (sitemapUrls.some((url) => !url.startsWith(`${siteUrl}/`) || /localhost|127\.0\.0\.1/i.test(url))) {
  throw new Error('The sitemap contains a non-production URL.')
}
if (sitemapUrls.includes(`${siteUrl}/boas-vindas`)) throw new Error('The canonical alias /boas-vindas must not be in the sitemap.')
if (sitemapUrls.some((url) => new RegExp(`/${privatePages.join('|')}(?:/|$)`).test(new URL(url).pathname))) {
  throw new Error('The sitemap contains a private route.')
}

const robotsTxt = await readFile(path.join(dist, 'robots.txt'), 'utf8')
if (!robotsTxt.includes('Allow: /') || !robotsTxt.includes(`Sitemap: ${siteUrl}/sitemap.xml`)) {
  throw new Error('robots.txt is missing the public crawl policy or sitemap URL.')
}
if (/^Disallow:/im.test(robotsTxt)) throw new Error('robots.txt must not block crawlers from reading page-level robots policies.')

try {
  await access(path.join(dist, 'ai-catalog.json'))
  throw new Error('An undocumented ai-catalog.json file must not be published.')
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

const redirects = await readFile(path.join(dist, '_redirects'), 'utf8')
if (!/^\/ai-catalog\.json\s+\/index\.html\s+404\s*$/m.test(redirects)) {
  throw new Error('/ai-catalog.json must return 404 before the SPA fallback.')
}

console.log(`Validated initial SEO HTML for ${publicPages.length} public and ${privatePages.length} private routes, plus sitemap and crawler policies.`)
