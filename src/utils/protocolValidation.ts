import type { Protocol, ProtocolApprovalStatus, ProtocolSectionKey, ProtocolSourceReference } from '../types'

const approvalStatuses: ProtocolApprovalStatus[] = [
  'Rascunho',
  'Aguardando revisão',
  'Aprovado',
  'Desatualizado',
  'Retirado',
]

const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const isValidSourceReference = (reference: ProtocolSourceReference): boolean => {
  if (
    typeof reference?.title !== 'string'
    || typeof reference.organization !== 'string'
    || typeof reference.url !== 'string'
    || typeof reference.consultedAt !== 'string'
  ) return false

  let url: URL
  try {
    url = new URL(reference.url)
  } catch {
    return false
  }

  return reference.title.trim().length > 0
    && reference.organization.trim().length > 0
    && url.protocol === 'https:'
    && Boolean(url.hostname)
    && isValidDate(reference.consultedAt)
    && (reference.publishedAt === null || isValidDate(reference.publishedAt))
}

export function isProtocolApproved(protocol: Protocol): boolean {
  return protocol.approvalStatus === 'Aprovado'
    && Array.isArray(protocol.sourceReferences)
    && protocol.sourceReferences.length > 0
    && protocol.sourceReferences.every(isValidSourceReference)
    && typeof protocol.reviewedBy === 'string'
    && protocol.reviewedBy.trim().length > 0
    && typeof protocol.reviewedAt === 'string'
    && isValidDate(protocol.reviewedAt)
}

export function getProtocolSummaryForDisplay(protocol: Protocol): string | null {
  return isProtocolApproved(protocol) ? protocol.summary : null
}

export function getProtocolSectionsForDisplay(
  protocol: Protocol,
): Array<{ key: ProtocolSectionKey; label: string; items: string[] }> {
  const sections: Array<{ key: ProtocolSectionKey; label: string; items: string[] }> = [
    { key: 'alerts', label: 'Sinais de alerta', items: protocol.alerts },
    { key: 'initialAssessment', label: 'Avaliação inicial', items: protocol.initialAssessment },
    { key: 'diagnosticCriteria', label: 'Critérios diagnósticos', items: protocol.diagnosticCriteria },
    { key: 'exams', label: 'Exames', items: protocol.exams },
    { key: 'monitoring', label: 'Monitoramento', items: protocol.monitoring },
    { key: 'referral', label: 'Encaminhamento', items: protocol.referral },
  ]

  if (isProtocolApproved(protocol)) {
    sections.push(
      { key: 'conduct', label: 'Conduta', items: protocol.conduct },
      { key: 'treatment', label: 'Tratamento', items: protocol.treatment },
      { key: 'contraindications', label: 'Contraindicações', items: protocol.contraindications },
    )
  }

  return sections
}

export function validateProtocolLibrary(protocols: Protocol[]): string[] {
  const issues: string[] = []
  const ids = new Set<string>()
  const stringFields = [
    'id',
    'title',
    'category',
    'population',
    'context',
    'summary',
    'source',
    'version',
    'responsible',
    'statusNote',
  ] as const
  const arrayFields = [
    'synonyms',
    'alerts',
    'initialAssessment',
    'diagnosticCriteria',
    'exams',
    'conduct',
    'treatment',
    'contraindications',
    'monitoring',
    'referral',
    'references',
  ] as const

  protocols.forEach((protocol, index) => {
    const label = protocol.id || `registro-${index + 1}`
    stringFields.forEach((field) => {
      if (typeof protocol[field] !== 'string' || !protocol[field].trim()) {
        issues.push(`${label}: campo obrigatório ausente ou inválido (${field}).`)
      }
    })
    if (!protocol.id.trim()) issues.push(`${label}: identificador ausente.`)
    if (ids.has(protocol.id)) issues.push(`${label}: identificador duplicado.`)
    ids.add(protocol.id)

    arrayFields.forEach((field) => {
      if (!Array.isArray(protocol[field]) || !protocol[field].every((item) => typeof item === 'string')) {
        issues.push(`${label}: lista ausente ou inválida (${field}).`)
      }
    })
    if (!approvalStatuses.includes(protocol.approvalStatus)) issues.push(`${label}: status de aprovação inválido.`)
    if (!isValidDate(protocol.lastReviewed)) issues.push(`${label}: data legada inválida.`)
    if (protocol.sourcePublishedAt !== null && !isValidDate(protocol.sourcePublishedAt)) {
      issues.push(`${label}: data de publicação da fonte inválida.`)
    }
    if (protocol.sourceConsultedAt !== null && !isValidDate(protocol.sourceConsultedAt)) {
      issues.push(`${label}: data de consulta à fonte inválida.`)
    }
    if (protocol.reviewedAt !== null && !isValidDate(protocol.reviewedAt)) {
      issues.push(`${label}: data de revisão clínica inválida.`)
    }
    if (!Array.isArray(protocol.sourceReferences)) issues.push(`${label}: referências estruturadas ausentes.`)
    else if (protocol.sourceReferences.some((reference) => !isValidSourceReference(reference))) {
      issues.push(`${label}: referência incompleta ou inválida.`)
    }

    if (protocol.approvalStatus === 'Aprovado' && !isProtocolApproved(protocol)) {
      issues.push(`${label}: aprovação requer referência verificável e revisor/data documentados.`)
    }
  })

  return issues
}
