export const branding = {
  commercialName: 'PlantãoMed',
  shortName: 'PlantãoMed',
  description:
    'Consulta rápida de condutas, protocolos e medicamentos para profissionais em plantão.',
  slogan: 'Informação clínica rápida quando a decisão precisa ser certeira.',
  primaryColor: '#0f172a',
  secondaryColor: '#2dd4bf',
  accentColor: '#ef4444',
  logoText: 'PM',
  pwaName: 'PlantãoMed',
  shareTitle: 'PlantãoMed',
  shareDescription:
    'Biblioteca prática de condutas e protocolos para atendimento emergencial e ambulatorial.',
  theme: {
    light: {
      background: '#f8fafc',
      surface: '#ffffff',
      muted: '#dbeafe',
      text: '#0f172a',
      textMuted: '#475569',
    },
    dark: {
      background: '#020817',
      surface: '#0f172a',
      muted: '#11263d',
      text: '#e2e8f0',
      textMuted: '#94a3b8',
    },
  },
} as const

export const appMetadata = {
  repoName: 'plantaomed',
  basePath: './',
  documentationFiles: [
    'README.md',
    '.github/workflows/deploy.yml',
    'public/manifest.webmanifest',
  ],
} as const
