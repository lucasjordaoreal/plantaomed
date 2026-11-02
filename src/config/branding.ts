export const branding = {
  commercialName: 'PlantãoMed',
  appVersion: '0.0.0',
  shortName: 'PlantãoMed',
  description:
    'Biblioteca de referências clínicas com status editorial para profissionais de saúde.',
  slogan: 'Pesquise temas clínicos e encontre documentos de fontes oficiais.',
  primaryColor: '#101114',
  secondaryColor: '#007aff',
  accentColor: '#b45309',
  logoText: 'PM',
  pwaName: 'PlantãoMed',
  shareTitle: 'PlantãoMed',
  shareDescription:
    'Biblioteca de referências clínicas com status editorial e fontes rastreáveis.',
  theme: {
    light: {
      background: '#ffffff',
      surface: '#ffffff',
      muted: '#eaf3ff',
      text: '#101114',
      textMuted: '#5c6470',
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
    'docs/CONTENT_AUDIT.md',
    'vite.config.ts',
  ],
} as const
