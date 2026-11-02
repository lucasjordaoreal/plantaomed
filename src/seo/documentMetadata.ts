import type { PublicPageMetadata } from './publicPageMetadata'
import { getCanonicalUrl } from './publicPageMetadata'
import { PUBLIC_SHARE_IMAGE_PATH, PUBLIC_SITE_URL } from '../config/publicSite'

const shareImageUrl = new URL(PUBLIC_SHARE_IMAGE_PATH, PUBLIC_SITE_URL).toString()
const metaAttributes = [
  ['name', 'description'],
  ['name', 'robots'],
  ['property', 'og:title'],
  ['property', 'og:description'],
  ['property', 'og:image'],
  ['property', 'og:image:width'],
  ['property', 'og:image:height'],
  ['property', 'og:image:alt'],
  ['property', 'og:url'],
  ['property', 'og:type'],
  ['property', 'og:site_name'],
  ['property', 'og:locale'],
  ['name', 'twitter:card'],
  ['name', 'twitter:title'],
  ['name', 'twitter:description'],
  ['name', 'twitter:image'],
  ['name', 'twitter:image:alt'],
] as const

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function renderMetadataTags(page: PublicPageMetadata): string {
  const canonicalUrl = getCanonicalUrl(page.path)
  const values: Record<string, string> = {
    'name:description': page.description,
    'name:robots': page.noIndex ? 'noindex, nofollow' : 'index, follow',
    'property:og:title': page.title,
    'property:og:description': page.description,
    'property:og:image': shareImageUrl,
    'property:og:image:width': '1200',
    'property:og:image:height': '630',
    'property:og:image:alt': 'PlantãoMed: ícone médico azul em fundo branco',
    'property:og:url': canonicalUrl,
    'property:og:type': page.type,
    'property:og:site_name': 'PlantãoMed',
    'property:og:locale': 'pt_BR',
    'name:twitter:card': 'summary_large_image',
    'name:twitter:title': page.title,
    'name:twitter:description': page.description,
    'name:twitter:image': shareImageUrl,
    'name:twitter:image:alt': 'PlantãoMed: ícone médico azul em fundo branco',
  }
  const tags = metaAttributes.map(([attribute, name]) =>
    `<meta ${attribute}="${name}" content="${escapeHtml(values[`${attribute}:${name}`])}" />`,
  )

  tags.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`)
  return tags.join('\n    ')
}

export function renderPageHtml(template: string, page: PublicPageMetadata): string {
  const title = `<title>${escapeHtml(page.title)}</title>`
  const headWithoutPageMetadata = template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*\/?>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*\/?>/gi, '')
  const head = headWithoutPageMetadata.replace('</head>', `    ${title}\n    ${renderMetadataTags(page)}\n  </head>`)

  if (head === headWithoutPageMetadata) throw new Error('HTML template is missing a closing head element.')
  return head
}
