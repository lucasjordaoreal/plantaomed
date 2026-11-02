import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const vite = await createServer({
  configFile: path.join(root, 'vite.config.ts'),
  root,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
})

try {
  const { getNetlifyRouteRedirects, getPublicSiteUrl, getSitemapPages, publicPageMetadata } =
    await vite.ssrLoadModule('/src/seo/publicPageMetadata.ts')
  const { renderPageHtml } = await vite.ssrLoadModule('/src/seo/documentMetadata.ts')
  const template = await readFile(path.join(dist, 'index.html'), 'utf8')
  const publicSiteUrl = getPublicSiteUrl()

  for (const page of publicPageMetadata) {
    const segments = page.path.split('/').filter(Boolean)
    const outputPath = path.join(dist, ...segments, 'index.html')
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, renderPageHtml(template, page), 'utf8')
  }

  const urls = getSitemapPages()
    .map(({ path: route }) => `  <url><loc>${publicSiteUrl}${route === '/' ? '/' : route}</loc></url>`)
    .join('\n')
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  await writeFile(path.join(dist, 'sitemap.xml'), sitemap, 'utf8')
  await writeFile(
    path.join(dist, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /assistente-clinico\nDisallow: /login\nDisallow: /recuperar-senha\nDisallow: /aceitar-convite\nDisallow: /redefinir-senha\nDisallow: /favoritos\nDisallow: /historico\n\nSitemap: ${publicSiteUrl}/sitemap.xml\n`,
    'utf8',
  )
  await writeFile(path.join(dist, '_redirects'), `${getNetlifyRouteRedirects().join('\n')}\n`, 'utf8')

  console.log(`Generated crawler-ready HTML for ${publicPageMetadata.length} routes, ${getSitemapPages().length} sitemap entries, and route-specific rewrites.`)
} finally {
  await vite.close()
}
