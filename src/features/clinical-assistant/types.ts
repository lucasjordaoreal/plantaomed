export type FindingState = 'present' | 'absent' | 'unknown' | 'not_assessed' | 'value'

export type ClinicalFinding = {
  id: string
  label: string
  state: FindingState
  value?: number
  unit?: string
}

export type ClinicalCase = {
  ageYears: string
  biologicalSex: 'female' | 'male' | 'other_or_intersex' | 'not_informed'
  pregnancyStatus: 'not_applicable' | 'pregnant' | 'not_pregnant' | 'unknown'
  weightKg: string
  careSetting: string
  comorbidities: string
  currentMedications: string
  allergies: string
  primaryPresentationId: string
  associatedPresentationIds: string[]
  onset: string
  duration: string
  progression: string
  severity: string
  location: string
  aggravatingFactors: string
  relievingFactors: string
  relevantNegatives: string
  physicalExamFindings: ClinicalFinding[]
  laboratoryResults: ClinicalFinding[]
  imagingResults: ClinicalFinding[]
  vitalSigns: Record<VitalSignId, VitalSignObservation>
  consciousness: Exclude<FindingState, 'value'>
}

export type VitalSignId =
  | 'systolicPressure'
  | 'diastolicPressure'
  | 'heartRate'
  | 'respiratoryRate'
  | 'oxygenSaturation'
  | 'temperature'
  | 'capillaryGlucose'

export type VitalSignObservation = {
  state: 'not_assessed' | 'unknown' | 'value'
  value: string
}

export type ClinicalEvidence = {
  id: string
  title: string
  organization: string
  url: string
  section: string
  version: string
  publishedAt: string | null
  accessedAt: string
  verificationStatus: 'cataloged' | 'source_verified'
  clinicalReviewStatus: 'not_reviewed' | 'clinically_reviewed'
}

export type ClinicalRulePredicate = {
  id: string
  inputId: string
  operator: 'equals' | 'at_least' | 'at_most'
  expectedValue: string | number
  unit?: string
  question: {
    prompt: string
    priority: 'high' | 'routine'
  }
}

export type ClinicalRuleOutcome = {
  severityFindings: string[]
  hypothesisIds: string[]
  investigationIds: string[]
  treatmentOptionIds: string[]
}

export type ClinicalRule = {
  id: string
  appliesTo: {
    population: string
    careSettings: string[]
    minimumAgeYears?: number
    maximumAgeYears?: number
  }
  presentationIds: string[]
  allOf: ClinicalRulePredicate[]
  notApplicableWhen: ClinicalRulePredicate[]
  outcome: ClinicalRuleOutcome
  references: ClinicalEvidence[]
  version: string
  contentStatus: 'cataloged' | 'source_verified' | 'clinically_reviewed' | 'withdrawn'
  clinicalReview: {
    reviewerId: string
    reviewerQualification: string
    reviewedAt: string
  } | null
  independentTestCaseIds: string[]
}

export type ClinicalHypothesis = {
  conditionId: string
  name: string
  specialty: string
  supportingFindings: string[]
  findingsThatReducePlausibility: string[]
  severityFindings: string[]
  diagnosticCriteria: string[]
  missingData: string[]
  investigationIds: string[]
  evidence: ClinicalEvidence[]
}

export type ClinicalInvestigation = {
  id: string
  conditionId: string
  category: 'initial' | 'complementary' | 'confirmation_or_exclusion'
  description: string
  applicabilityCriteria: string[]
  limitations: string[]
  evidence: ClinicalEvidence[]
}

export type MedicationReference = {
  activeIngredient: string
  dcb: string
  pharmacologicalClass: string
  regulatoryStatus: string
  professionalLeafletUrl: string | null
  evidence: ClinicalEvidence[]
}

export type TreatmentOption = {
  id: string
  conditionId: string
  type: 'non_pharmacological' | 'pharmacological'
  description: string
  criteria: string[]
  eligibilityPredicates: ClinicalRulePredicate[]
  contraindicationPredicates: ClinicalRulePredicate[]
  safetyReview: {
    reviewerId: string
    reviewerQualification: string
    reviewedAt: string
    contraindicationsReviewed: boolean
    interactionsReviewed: boolean
    populationRestrictionsReviewed: boolean
  } | null
  population: string
  restrictions: string[]
  contraindications: string[]
  monitoring: string[]
  medication: MedicationReference | null
  evidence: ClinicalEvidence[]
}

export type ClinicalAssessmentResult = {
  status: 'insufficient_validated_content' | 'pending_clinical_data' | 'assessed'
  severityFindings: string[]
  hypotheses: ClinicalHypothesis[]
  investigations: ClinicalInvestigation[]
  treatmentOptions: TreatmentOption[]
  matchedRuleIds: string[]
  questions: Array<{
    inputId: string
    prompt: string
    priority: 'high' | 'routine'
  }>
  evidence: ClinicalEvidence[]
  explanation: string
}

export type ClinicalKnowledgeBase = {
  version: string
  sources: ClinicalEvidence[]
  hypotheses: ClinicalHypothesis[]
  investigations: ClinicalInvestigation[]
  treatmentOptions: TreatmentOption[]
  rules: ClinicalRule[]
}
