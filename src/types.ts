export type ProtocolSectionKey =
  | 'summary'
  | 'alerts'
  | 'initialAssessment'
  | 'diagnosticCriteria'
  | 'exams'
  | 'conduct'
  | 'treatment'
  | 'contraindications'
  | 'monitoring'
  | 'referral'
  | 'references'

export type Protocol = {
  id: string
  title: string
  category: string
  synonyms: string[]
  population: string
  context: string
  summary: string
  alerts: string[]
  initialAssessment: string[]
  diagnosticCriteria: string[]
  exams: string[]
  conduct: string[]
  treatment: string[]
  contraindications: string[]
  monitoring: string[]
  referral: string[]
  references: string[]
  source: string
  lastReviewed: string
  version: string
  approvalStatus: 'Rascunho' | 'Aguardando revisão' | 'Aprovado' | 'Desatualizado' | 'Retirado'
  responsible: string
  statusNote: string
}

export type Category = {
  id: string
  name: string
  description: string
  icon: string
  protocols: string[]
}
