import type { ClinicalKnowledgeBase } from '../types'
import { clinicalKnowledgeSources } from '../knowledgeSources'

export const clinicalKnowledgeBase: ClinicalKnowledgeBase = {
  version: '0.1.0',
  sources: clinicalKnowledgeSources,
  hypotheses: [],
  investigations: [],
  treatmentOptions: [],
  rules: [],
}
