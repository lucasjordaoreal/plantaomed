import type { ClinicalPresentation } from '../types'

const requestedPresentations: Omit<ClinicalPresentation, 'origin'>[] = [
  { id: 'dor-toracica', name: 'Dor torácica', group: 'Cardiovasculares', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'palpitacoes', name: 'Palpitações', group: 'Cardiovasculares', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'sincope', name: 'Síncope', group: 'Cardiovasculares', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'pre-sincope', name: 'Pré-síncope', group: 'Cardiovasculares', synonyms: ['presíncope'], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'edema-de-membros-inferiores', name: 'Edema de membros inferiores', group: 'Cardiovasculares', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'hipotensao', name: 'Hipotensão', group: 'Cardiovasculares', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'hipertensao-sintomatica', name: 'Hipertensão sintomática', group: 'Cardiovasculares', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'dispneia', name: 'Dispneia', group: 'Respiratórios', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'tosse', name: 'Tosse', group: 'Respiratórios', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'hemoptise', name: 'Hemoptise', group: 'Respiratórios', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'sibilancia', name: 'Sibilância', group: 'Respiratórios', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'hipoxemia', name: 'Hipoxemia', group: 'Respiratórios', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'dor-toracica-pleuritica', name: 'Dor torácica pleurítica', group: 'Respiratórios', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'cefaleia', name: 'Cefaleia', group: 'Neurológicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'tontura', name: 'Tontura', group: 'Neurológicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'vertigem', name: 'Vertigem', group: 'Neurológicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'deficit-neurologico-focal', name: 'Déficit neurológico focal', group: 'Neurológicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'parestesias', name: 'Parestesias', group: 'Neurológicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'rebaixamento-nivel-consciencia', name: 'Rebaixamento do nível de consciência', group: 'Neurológicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'crise-convulsiva', name: 'Crise convulsiva', group: 'Neurológicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'dor-abdominal', name: 'Dor abdominal', group: 'Gastrointestinais', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'nauseas-e-vomitos', name: 'Náuseas e vômitos', group: 'Gastrointestinais', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'diarreia', name: 'Diarreia', group: 'Gastrointestinais', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'constipacao', name: 'Constipação', group: 'Gastrointestinais', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'hematemese', name: 'Hematêmese', group: 'Gastrointestinais', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'melena', name: 'Melena', group: 'Gastrointestinais', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'hematoquezia', name: 'Hematoquezia', group: 'Gastrointestinais', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'ictericia', name: 'Icterícia', group: 'Gastrointestinais', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'disuria', name: 'Disúria', group: 'Geniturinários', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'hematuria', name: 'Hematúria', group: 'Geniturinários', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'oliguria', name: 'Oligúria', group: 'Geniturinários', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'anuria', name: 'Anúria', group: 'Geniturinários', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'dor-lombar', name: 'Dor lombar', group: 'Geniturinários', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'dor-pelvica', name: 'Dor pélvica', group: 'Geniturinários', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'febre', name: 'Febre', group: 'Sistêmicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'hipotermia', name: 'Hipotermia', group: 'Sistêmicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'astenia', name: 'Astenia', group: 'Sistêmicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'perda-ponderal', name: 'Perda ponderal', group: 'Sistêmicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'desidratacao', name: 'Desidratação', group: 'Sistêmicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'alteracoes-glicemicas', name: 'Alterações glicêmicas', group: 'Sistêmicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'edema-generalizado', name: 'Edema generalizado', group: 'Sistêmicos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'agitacao-psicomotora', name: 'Agitação psicomotora', group: 'Psiquiátricos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'ideacao-suicida', name: 'Ideação suicida', group: 'Psiquiátricos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'alteracao-comportamental-aguda', name: 'Alteração comportamental aguda', group: 'Psiquiátricos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'sintomas-psicoticos', name: 'Sintomas psicóticos', group: 'Psiquiátricos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
  { id: 'alteracoes-graves-humor', name: 'Alterações graves do humor', group: 'Psiquiátricos', synonyms: [], relatedTopicIds: [], referenceIds: [], contentStatus: 'cataloged' },
]

export const clinicalPresentations: ClinicalPresentation[] = requestedPresentations.map((presentation) => ({
  ...presentation,
  origin: 'user_provided_term',
}))

const normalize = (value: string): string => value
  .toLocaleLowerCase('pt-BR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export function searchClinicalPresentations(query: string): ClinicalPresentation[] {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return clinicalPresentations

  return clinicalPresentations.filter((presentation) =>
    normalize(`${presentation.name} ${presentation.group} ${presentation.synonyms.join(' ')}`)
      .includes(normalizedQuery),
  )
}
