import { describe, expect, it } from 'vitest'
import type { ClinicalCase, ClinicalKnowledgeBase, ClinicalRule } from '../types'
import { assessClinicalCase } from './assessCase'

const emptyCase: ClinicalCase = {
  ageYears: '',
  biologicalSex: 'not_informed',
  pregnancyStatus: 'unknown',
  weightKg: '',
  careSetting: '',
  comorbidities: '',
  currentMedications: '',
  allergies: '',
  primaryPresentationId: 'dor-toracica',
  associatedPresentationIds: ['dispneia'],
  onset: '',
  duration: '',
  progression: '',
  severity: '',
  location: '',
  aggravatingFactors: '',
  relievingFactors: '',
  relevantNegatives: '',
  physicalExamFindings: [],
  laboratoryResults: [],
  imagingResults: [],
  vitalSigns: {
    systolicPressure: { state: 'not_assessed', value: '' },
    diastolicPressure: { state: 'not_assessed', value: '' },
    heartRate: { state: 'unknown', value: '' },
    respiratoryRate: { state: 'not_assessed', value: '' },
    oxygenSaturation: { state: 'not_assessed', value: '' },
    temperature: { state: 'not_assessed', value: '' },
    capillaryGlucose: { state: 'not_assessed', value: '' },
  },
  consciousness: 'not_assessed',
}

const reference = {
  id: 'fixture-reference',
  title: 'Software-only rule engine fixture',
  organization: 'PlantãoMed tests',
  url: 'https://example.test/fixture',
  section: 'synthetic fixture; not a clinical source',
  version: 'test',
  publishedAt: null,
  accessedAt: '2026-11-02',
  verificationStatus: 'source_verified' as const,
  clinicalReviewStatus: 'clinically_reviewed' as const,
}

const fixtureRule: ClinicalRule = {
  id: 'fixture-rule',
  appliesTo: { population: 'synthetic test population', careSettings: [] },
  presentationIds: ['dor-toracica'],
  allOf: [{
    id: 'fixture-finding',
    inputId: 'physicalExamFindings.synthetic-sign',
    operator: 'equals',
    expectedValue: 'present',
    question: { prompt: 'Synthetic question from a software fixture?', priority: 'high' },
  }],
  outcome: { severityFindings: [], hypothesisIds: ['fixture-condition'], investigationIds: ['fixture-investigation'], treatmentOptionIds: [] },
  references: [reference],
  version: 'test',
  notApplicableWhen: [],
  contentStatus: 'clinically_reviewed',
  clinicalReview: { reviewerId: 'fixture-only', reviewerQualification: 'software test fixture', reviewedAt: '2026-11-02' },
  independentTestCaseIds: ['fixture-case-1'],
}

const fixtureKnowledge: ClinicalKnowledgeBase = {
  version: 'test',
  sources: [reference],
  rules: [fixtureRule],
  hypotheses: [{
    conditionId: 'fixture-condition',
    name: 'Synthetic test condition',
    specialty: 'software test',
    supportingFindings: ['Synthetic finding'],
    findingsThatReducePlausibility: [],
    severityFindings: [],
    diagnosticCriteria: [],
    missingData: [],
    investigationIds: ['fixture-investigation'],
    evidence: [reference],
  }],
  investigations: [{
    id: 'fixture-investigation',
    conditionId: 'fixture-condition',
    category: 'initial',
    description: 'Synthetic investigation for engine test only',
    applicabilityCriteria: ['Synthetic condition matched'],
    limitations: [],
    evidence: [reference],
  }],
  treatmentOptions: [],
}

describe('clinical assistant assessment engine', () => {
  it('returns insufficient validated content rather than inferring clinical results', () => {
    const result = assessClinicalCase(emptyCase)
    expect(result.status).toBe('insufficient_validated_content')
    expect(result.severityFindings).toEqual([])
    expect(result.hypotheses).toEqual([])
    expect(result.investigations).toEqual([])
    expect(result.treatmentOptions).toEqual([])
    expect(result.explanation).toMatch(/Nenhuma hipótese, alerta, investigação ou opção terapêutica foi inferida/)
  })

  it('does not execute draft rules even when their software metadata looks complete', () => {
    const result = assessClinicalCase(emptyCase, {
      ...fixtureKnowledge,
      rules: [{ ...fixtureRule, contentStatus: 'source_verified' }],
    })
    expect(result.status).toBe('insufficient_validated_content')
    expect(result.matchedRuleIds).toEqual([])
  })

  it('does not execute clinical review claims when the source has not been clinically reviewed', () => {
    const result = assessClinicalCase(emptyCase, {
      ...fixtureKnowledge,
      rules: [{
        ...fixtureRule,
        references: [{ ...reference, clinicalReviewStatus: 'not_reviewed' }],
      }],
    })
    expect(result.status).toBe('insufficient_validated_content')
    expect(result.matchedRuleIds).toEqual([])
  })

  it('returns a rule-bound question when required clinical information is unknown', () => {
    const result = assessClinicalCase(emptyCase, fixtureKnowledge)
    expect(result.status).toBe('pending_clinical_data')
    expect(result.questions).toEqual([{
      inputId: 'physicalExamFindings.synthetic-sign',
      prompt: 'Synthetic question from a software fixture?',
      priority: 'high',
    }])
    expect(result.hypotheses).toEqual([])
  })

  it('resolves only the linked entities when all fixture criteria match', () => {
    const clinicalCase = {
      ...emptyCase,
      physicalExamFindings: [{ id: 'synthetic-sign', label: 'Synthetic sign', state: 'present' as const }],
    }
    const result = assessClinicalCase(clinicalCase, fixtureKnowledge)
    expect(result.status).toBe('assessed')
    expect(result.matchedRuleIds).toEqual(['fixture-rule'])
    expect(result.hypotheses.map(({ conditionId }) => conditionId)).toEqual(['fixture-condition'])
    expect(result.investigations.map(({ id }) => id)).toEqual(['fixture-investigation'])
    expect(result.treatmentOptions).toEqual([])
    expect(result.evidence).toEqual([reference])
  })

  it('does not run rules with broken evidence or dangling outcome links', () => {
    const malformedRule = {
      ...fixtureRule,
      references: [{ ...reference, url: 'http://example.test/insecure' }],
      outcome: { ...fixtureRule.outcome, hypothesisIds: ['missing-condition'] },
    }
    const result = assessClinicalCase(emptyCase, { ...fixtureKnowledge, rules: [malformedRule] })
    expect(result.status).toBe('insufficient_validated_content')
    expect(result.matchedRuleIds).toEqual([])
  })

  it('uses explicit exclusion findings and does not infer a negative from a missing finding', () => {
    const exclusionRule = {
      ...fixtureRule,
      notApplicableWhen: [{
        id: 'excluded-fixture',
        inputId: 'physicalExamFindings.fixture-exclusion',
        operator: 'equals' as const,
        expectedValue: 'present',
        question: { prompt: 'Synthetic exclusion check?', priority: 'high' as const },
      }],
    }

    const missingFindingResult = assessClinicalCase(emptyCase, {
      ...fixtureKnowledge,
      rules: [exclusionRule],
    })
    expect(missingFindingResult.status).toBe('pending_clinical_data')
    expect(missingFindingResult.questions.map(({ inputId }) => inputId)).toContain('physicalExamFindings.fixture-exclusion')

    const explicitlyExcluded = assessClinicalCase({
      ...emptyCase,
      physicalExamFindings: [{ id: 'fixture-exclusion', label: 'Synthetic exclusion', state: 'present' }],
    }, { ...fixtureKnowledge, rules: [exclusionRule] })
    expect(explicitlyExcluded.status).toBe('insufficient_validated_content')
    expect(explicitlyExcluded.matchedRuleIds).toEqual([])
  })

  it('withholds a linked treatment while required safety inputs are unknown or contraindicating', () => {
    const treatmentOption = {
      id: 'fixture-treatment',
      conditionId: 'fixture-condition',
      type: 'non_pharmacological' as const,
      description: 'Synthetic option for software test only',
      criteria: ['Synthetic eligibility criterion'],
      eligibilityPredicates: [{
        id: 'eligible',
        inputId: 'physicalExamFindings.synthetic-eligibility',
        operator: 'equals' as const,
        expectedValue: 'present',
        question: { prompt: 'Synthetic eligibility question?', priority: 'high' as const },
      }],
      contraindicationPredicates: [{
        id: 'contraindication',
        inputId: 'physicalExamFindings.synthetic-contraindication',
        operator: 'equals' as const,
        expectedValue: 'present',
        question: { prompt: 'Synthetic contraindication question?', priority: 'high' as const },
      }],
      safetyReview: {
        reviewerId: 'fixture-only',
        reviewerQualification: 'software test fixture',
        reviewedAt: '2026-11-02',
        contraindicationsReviewed: true,
        interactionsReviewed: true,
        populationRestrictionsReviewed: true,
      },
      population: 'synthetic test population',
      restrictions: [],
      contraindications: ['Synthetic test-only restriction'],
      monitoring: [],
      medication: null,
      evidence: [reference],
    }
    const treatmentKnowledge = {
      ...fixtureKnowledge,
      rules: [{
        ...fixtureRule,
        outcome: { ...fixtureRule.outcome, treatmentOptionIds: ['fixture-treatment'] },
      }],
      treatmentOptions: [treatmentOption],
    }
    const matchedFindings = {
      ...emptyCase,
      physicalExamFindings: [
        { id: 'synthetic-sign', label: 'Synthetic sign', state: 'present' as const },
        { id: 'synthetic-eligibility', label: 'Synthetic eligibility', state: 'present' as const },
      ],
    }

    const unknownContraindication = assessClinicalCase(matchedFindings, treatmentKnowledge)
    expect(unknownContraindication.treatmentOptions).toEqual([])
    expect(unknownContraindication.questions.map(({ inputId }) => inputId)).toContain('physicalExamFindings.synthetic-contraindication')

    const knownSafeCase = {
      ...matchedFindings,
      physicalExamFindings: [
        ...matchedFindings.physicalExamFindings,
        { id: 'synthetic-contraindication', label: 'Synthetic contraindication', state: 'absent' as const },
      ],
    }
    expect(assessClinicalCase(knownSafeCase, treatmentKnowledge).treatmentOptions.map(({ id }) => id))
      .toEqual(['fixture-treatment'])
  })

  it('does not convert numeric units when applying a rule predicate', () => {
    const numericRule = {
      ...fixtureRule,
      allOf: [{
        id: 'numeric-fixture',
        inputId: 'laboratoryResults.synthetic-value',
        operator: 'at_least' as const,
        expectedValue: 4.5,
        unit: 'g/L',
        question: { prompt: 'Confirm the result in g/L?', priority: 'high' as const },
      }],
    }
    const clinicalCase = {
      ...emptyCase,
      laboratoryResults: [{ id: 'synthetic-value', label: 'Synthetic numeric input', state: 'value' as const, value: 5, unit: 'mg/L' }],
    }
    const result = assessClinicalCase(clinicalCase, { ...fixtureKnowledge, rules: [numericRule] })
    expect(result.status).toBe('pending_clinical_data')
    expect(result.questions[0].prompt).toBe('Confirm the result in g/L?')
    expect(result.hypotheses).toEqual([])
  })
})
