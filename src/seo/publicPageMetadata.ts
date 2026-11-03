import { clinicalPresentations } from '../data/clinicalPresentations'
import { protocols } from '../data/protocols'
import { PUBLIC_SITE_URL, getPublicUrl } from '../config/publicSite'
import { getProtocolSummaryForDisplay, isProtocolApproved } from '../utils/protocolValidation'
import { calculatorShareMetadata } from './calculatorShareMetadata'

export type PublicPageMetadata = {
  path: string
  title: string
  description: string
  type: 'website' | 'article'
  noIndex?: boolean
}

export const defaultPageMetadata: PublicPageMetadata = {
  path: '/',
  title: 'PlantãoMed — Plataforma Médica',
  description: 'Biblioteca clínica, medicamentos, diretrizes e calculadoras para profissionais de saúde.',
  type: 'website',
}

const fixedPages: PublicPageMetadata[] = [
  defaultPageMetadata,
  { path: '/inicio', title: 'PlantãoMed — Plataforma Médica', description: defaultPageMetadata.description, type: 'website' },
  { path: '/protocolos', title: 'Biblioteca Clínica | PlantãoMed', description: 'Explore temas clínicos e referências médicas organizados por especialidade.', type: 'website' },
  { path: '/medicamentos', title: 'Medicamentos | PlantãoMed', description: 'Consulte o catálogo farmacológico brasileiro e suas informações regulatórias.', type: 'website' },
  { path: '/calculadoras', title: 'Calculadoras Médicas | PlantãoMed', description: 'Escores, índices e equações clínicas com referências e critérios de aplicação.', type: 'website' },
  { path: '/diretrizes', title: 'Diretrizes Brasileiras | PlantãoMed', description: 'Consulte referências e documentos científicos utilizados na prática médica brasileira.', type: 'website' },
  { path: '/sinais-e-sintomas', title: 'Sinais e Sintomas | PlantãoMed', description: 'Explore manifestações clínicas e referências relacionadas à avaliação médica.', type: 'website' },
  { path: '/sobre', title: 'Sobre o PlantãoMed', description: 'Conheça a plataforma PlantãoMed e seus recursos de consulta clínica.', type: 'website' },
  { path: '/boas-vindas', title: 'Boas-vindas | PlantãoMed', description: 'Conheça a plataforma PlantãoMed.', type: 'website', noIndex: true },
  { path: '/login', title: 'Acesso ao Assistente Clínico | PlantãoMed', description: 'Acesso restrito ao Assistente Clínico do PlantãoMed.', type: 'website', noIndex: true },
  { path: '/recuperar-senha', title: 'Recuperar senha | PlantãoMed', description: 'Recuperação de acesso ao Assistente Clínico.', type: 'website', noIndex: true },
  { path: '/aceitar-convite', title: 'Aceitar convite | PlantãoMed', description: 'Configuração de acesso ao Assistente Clínico.', type: 'website', noIndex: true },
  { path: '/redefinir-senha', title: 'Redefinir senha | PlantãoMed', description: 'Redefinição segura de acesso ao Assistente Clínico.', type: 'website', noIndex: true },
  { path: '/assistente-clinico', title: 'Assistente Clínico | PlantãoMed', description: 'Área clínica privada do PlantãoMed. Acesso restrito.', type: 'website', noIndex: true },
  { path: '/favoritos', title: 'Favoritos | PlantãoMed', description: 'Conteúdos salvos neste dispositivo no PlantãoMed.', type: 'website', noIndex: true },
  { path: '/historico', title: 'Histórico | PlantãoMed', description: 'Histórico local de navegação do PlantãoMed.', type: 'website', noIndex: true },
]

const protocolPages: PublicPageMetadata[] = protocols.map((protocol) => {
  const approved = isProtocolApproved(protocol)
  const approvedSummary = getProtocolSummaryForDisplay(protocol)
  const description = approved
    ? approvedSummary ?? protocol.summary
    : `Registro de ${protocol.category} sobre ${protocol.title} no catálogo PlantãoMed. Conteúdo ainda não validado para uso assistencial.`

  return {
    path: `/protocolos/${protocol.id}`,
    title: `${protocol.title} | PlantãoMed`,
    description,
    type: 'article',
    noIndex: !approved,
  }
})

const calculatorPages: PublicPageMetadata[] = calculatorShareMetadata.map((calculator) => ({
  path: `/calculadoras/${calculator.id}`,
  title: `${calculator.name} | PlantãoMed`,
  description: `${calculator.purpose} Ferramenta de referência técnica; não substitui avaliação profissional.`,
  type: 'article',
}))

const presentationPages: PublicPageMetadata[] = clinicalPresentations.map((presentation) => ({
  path: `/sinais-e-sintomas/${presentation.id}`,
  title: `${presentation.name} | PlantãoMed`,
  description: `${presentation.name}: termo catalogado em ${presentation.group}. O índice não apresenta relações diagnósticas ou condutas.`,
  type: 'article',
}))

export const publicPageMetadata = [...fixedPages, ...protocolPages, ...calculatorPages, ...presentationPages]

const pageMetadataByPath = new Map(publicPageMetadata.map((page) => [page.path, page]))

export function normalizePublicPath(pathname: string): string {
  const decoded = decodeURIComponent(pathname)
  if (decoded === '/') return decoded
  return decoded.replace(/\/+$/, '') || '/'
}

export function getPageMetadata(pathname: string): PublicPageMetadata {
  const path = normalizePublicPath(pathname)
  return pageMetadataByPath.get(path) ?? {
    path,
    title: 'Página não encontrada | PlantãoMed',
    description: 'A página solicitada não foi encontrada no PlantãoMed.',
    type: 'website',
    noIndex: true,
  }
}

export function getCanonicalUrl(pathname: string): string {
  return getPublicUrl(normalizePublicPath(pathname))
}

export function getSitemapPages(): PublicPageMetadata[] {
  return publicPageMetadata.filter((page) => !page.noIndex)
}

export function getNetlifyRouteRedirects(): string[] {
  const pageRewrites = publicPageMetadata
    .filter(({ path }) => path !== '/')
    .flatMap(({ path }) => [
      `${path} ${path}/index.html 200`,
      `${path}/ ${path}/index.html 200`,
    ])
  return [
    ...pageRewrites,
    '/ai-catalog.json /index.html 404',
    '/llms.txt /index.html 404',
    '/* /index.html 200',
  ]
}

export function getPublicSiteUrl(): string {
  return PUBLIC_SITE_URL
}
