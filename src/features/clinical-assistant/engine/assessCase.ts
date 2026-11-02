import type {
  ClinicalAssessmentResult,
  ClinicalCase,
  ClinicalFinding,
  ClinicalKnowledgeBase,
  ClinicalRule,
  ClinicalRulePredicate,
  FindingState,
} from '../types'
import { clinicalKnowledgeBase } from '../rules'
import { vitalSignDefinitions } from '../validation/vitalSigns'

type ObservedInput =
  | { state: 'known'; value: string | number; unit?: string }
  | { state: FindingState }

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isAuditableEvidence(reference: ClinicalRule['references'][number]): boolean {
  let url: URL
  try {
    url = new URL(reference.url)
  } catch {
    return false
  }

  return Boolean(reference.id.trim())
    && Boolean(reference.title.trim())
    && Boolean(reference.organization.trim())
    && Boolean(reference.section.trim())
    && Boolean(reference.version.trim())
    && url.protocol === 'https:'
    && isValidDate(reference.accessedAt)
    && (reference.publishedAt === null || isValidDate(reference.publishedAt))
    && reference.verificationStatus === 'source_verified'
    && reference.clinicalReviewStatus === 'clinically_reviewed'
}

function hasAuditableEvidence(references: ClinicalRule['references']): boolean {
  return references.length > 0 && references.every(isAuditableEvidence)
}

function isExecutable(rule: ClinicalRule, knowledgeBase: ClinicalKnowledgeBase): boolean {
  const allReferencedEntitiesExist = rule.outcome.hypothesisIds.every((id) =>
    knowledgeBase.hypotheses.some(({ conditionId }) => conditionId === id),
  ) && rule.outcome.investigationIds.every((id) =>
    knowledgeBase.investigations.some((investigation) => investigation.id === id),
  ) && rule.outcome.treatmentOptionIds.every((id) =>
    knowledgeBase.treatmentOptions.some((option) => option.id === id),
  )
  const outcomeEvidence = [
    ...knowledgeBase.hypotheses.filter(({ conditionId }) => rule.outcome.hypothesisIds.includes(conditionId)).map(({ evidence }) => evidence),
    ...knowledgeBase.investigations.filter(({ id }) => rule.outcome.investigationIds.includes(id)).map(({ evidence }) => evidence),
    ...knowledgeBase.treatmentOptions.filter(({ id }) => rule.outcome.treatmentOptionIds.includes(id)).map(({ evidence }) => evidence),
    ...knowledgeBase.treatmentOptions
      .filter((option) => rule.outcome.treatmentOptionIds.includes(option.id) && option.medication !== null)
      .map((option) => option.medication?.evidence ?? []),
  ]
  const outcomeHasEvidence = outcomeEvidence.every((references) => hasAuditableEvidence(references))
  const treatmentOptionsAreReviewed = knowledgeBase.treatmentOptions
    .filter((option) => rule.outcome.treatmentOptionIds.includes(option.id))
    .every((option) =>
      option.eligibilityPredicates.length > 0
      && Boolean(option.safetyReview?.reviewerId.trim())
      && Boolean(option.safetyReview?.reviewerQualification.trim())
      && Boolean(option.safetyReview?.reviewedAt && isValidDate(option.safetyReview.reviewedAt))
      && option.safetyReview?.contraindicationsReviewed === true
      && option.safetyReview?.interactionsReviewed === true
      && option.safetyReview?.populationRestrictionsReviewed === true,
    )

  return rule.contentStatus === 'clinically_reviewed'
    && Boolean(rule.clinicalReview?.reviewerId.trim())
    && Boolean(rule.clinicalReview?.reviewerQualification.trim())
    && Boolean(rule.clinicalReview?.reviewedAt && isValidDate(rule.clinicalReview.reviewedAt))
    && rule.independentTestCaseIds.length > 0
    && rule.allOf.length > 0
    && [...rule.allOf, ...rule.notApplicableWhen].every(isValidPredicate)
    && hasAuditableEvidence(rule.references)
    && allReferencedEntitiesExist
    && outcomeHasEvidence
    && treatmentOptionsAreReviewed
}

function isValidPredicate(predicate: ClinicalRulePredicate): boolean {
  const allowedInputs = new Set([
    'primaryPresentationId',
    'ageYears',
    'careSetting',
    'consciousness',
    'weightKg',
    'biologicalSex',
    'pregnancyStatus',
    'onset',
    'duration',
    'progression',
    'severity',
    'location',
    'aggravatingFactors',
    'relievingFactors',
    'relevantNegatives',
  ])
  const expectsNumber = typeof predicate.expectedValue === 'number' || predicate.operator !== 'equals'
  const supportsNumericInput = predicate.inputId === 'ageYears'
    || predicate.inputId === 'weightKg'
    || /^vitalSigns\./.test(predicate.inputId)
    || /^(physicalExamFindings|laboratoryResults|imagingResults)\./.test(predicate.inputId)

  return Boolean(predicate.id.trim())
    && Boolean(predicate.inputId.trim())
    && Boolean(predicate.question.prompt.trim())
    && (typeof predicate.expectedValue === 'number'
      ? Number.isFinite(predicate.expectedValue) && Boolean(predicate.unit?.trim())
      : predicate.operator === 'equals')
    && (!expectsNumber || supportsNumericInput)
    && (allowedInputs.has(predicate.inputId)
      || /^vitalSigns\.(systolicPressure|diastolicPressure|heartRate|respiratoryRate|oxygenSaturation|temperature|capillaryGlucose)$/.test(predicate.inputId)
      || /^(physicalExamFindings|laboratoryResults|imagingResults)\.[A-Za-z0-9_-]+$/.test(predicate.inputId)
      || /^associatedPresentationIds\.[A-Za-z0-9_-]+$/.test(predicate.inputId))
}

function findObservation(clinicalCase: ClinicalCase, inputId: string): ObservedInput {
  if (inputId === 'primaryPresentationId' || inputId === 'biologicalSex' || inputId === 'pregnancyStatus') {
    const value = inputId === 'primaryPresentationId'
      ? clinicalCase.primaryPresentationId
      : clinicalCase[inputId]
    return value && value !== 'not_informed' && value !== 'unknown'
      ? { state: 'known', value }
      : { state: 'unknown' }
  }

  const associatedPresentationMatch = /^associatedPresentationIds\.([A-Za-z0-9_-]+)$/.exec(inputId)
  if (associatedPresentationMatch) {
    return clinicalCase.associatedPresentationIds.includes(associatedPresentationMatch[1])
      ? { state: 'known', value: 'present' }
      : { state: 'unknown' }
  }

  const textFields = [
    'onset',
    'duration',
    'progression',
    'severity',
    'location',
    'aggravatingFactors',
    'relievingFactors',
    'relevantNegatives',
  ] as const
  if ((textFields as readonly string[]).includes(inputId)) {
    const value = clinicalCase[inputId as typeof textFields[number]]
    return value.trim() ? { state: 'known', value } : { state: 'unknown' }
  }

  if (inputId === 'ageYears') {
    const age = Number(clinicalCase.ageYears)
    return clinicalCase.ageYears.trim() && Number.isFinite(age)
      ? { state: 'known', value: age, unit: 'years' }
      : { state: 'unknown' }
  }

  if (inputId === 'weightKg') {
    const weight = Number(clinicalCase.weightKg)
    return clinicalCase.weightKg.trim() && Number.isFinite(weight)
      ? { state: 'known', value: weight, unit: 'kg' }
      : { state: 'unknown' }
  }

  if (inputId === 'careSetting') {
    return clinicalCase.careSetting
      ? { state: 'known', value: clinicalCase.careSetting }
      : { state: 'unknown' }
  }

  if (inputId === 'consciousness') {
    return clinicalCase.consciousness === 'not_assessed' || clinicalCase.consciousness === 'unknown'
      ? { state: clinicalCase.consciousness }
      : { state: 'known', value: clinicalCase.consciousness }
  }

  const vitalMatch = /^vitalSigns\.([A-Za-z]+)$/.exec(inputId)
  if (vitalMatch) {
    const vitalId = vitalMatch[1] as keyof ClinicalCase['vitalSigns']
    const observation = clinicalCase.vitalSigns[vitalId]
    if (!observation || observation.state !== 'value') return { state: observation?.state ?? 'unknown' }
    const value = Number(observation.value)
    const unit = vitalSignDefinitions.find(({ id }) => id === vitalId)?.unit
    return Number.isFinite(value) && unit ? { state: 'known', value, unit } : { state: 'unknown' }
  }

  const findingMatch = /^(physicalExamFindings|laboratoryResults|imagingResults)\.([A-Za-z0-9_-]+)$/.exec(inputId)
  if (findingMatch) {
    const findings = clinicalCase[findingMatch[1] as 'physicalExamFindings' | 'laboratoryResults' | 'imagingResults']
    const finding = findings.find(({ id }) => id === findingMatch[2])
    return finding ? findingObservation(finding) : { state: 'unknown' }
  }

  return { state: 'unknown' }
}

function findingObservation(finding: ClinicalFinding): ObservedInput {
  if (finding.state !== 'value') {
    return finding.state === 'present' || finding.state === 'absent'
      ? { state: 'known', value: finding.state }
      : { state: finding.state }
  }

  return typeof finding.value === 'number' && Number.isFinite(finding.value)
    ? { state: 'known', value: finding.value, unit: finding.unit }
    : { state: 'unknown' }
}

function matchesPredicate(observation: ObservedInput, predicate: ClinicalRulePredicate): boolean | null {
  if (observation.state !== 'known') return null

  if (predicate.operator === 'equals') {
    if (typeof predicate.expectedValue === 'number') {
      if (typeof observation.value !== 'number'
        || !predicate.unit
        || !observation.unit
        || predicate.unit.trim().toLocaleLowerCase('pt-BR') !== observation.unit.trim().toLocaleLowerCase('pt-BR')) {
        return null
      }
      return observation.value === predicate.expectedValue
    }
    return String(observation.value).trim().toLocaleLowerCase('pt-BR')
      === String(predicate.expectedValue).trim().toLocaleLowerCase('pt-BR')
  }

  if (typeof observation.value !== 'number' || typeof predicate.expectedValue !== 'number') return null
  if (!predicate.unit || !observation.unit
    || predicate.unit.trim().toLocaleLowerCase('pt-BR') !== observation.unit.trim().toLocaleLowerCase('pt-BR')) {
    return null
  }
  return predicate.operator === 'at_least'
    ? observation.value >= predicate.expectedValue
    : observation.value <= predicate.expectedValue
}

function emptyResult(): ClinicalAssessmentResult {
  return {
    status: 'insufficient_validated_content',
    severityFindings: [],
    hypotheses: [],
    investigations: [],
    treatmentOptions: [],
    matchedRuleIds: [],
    questions: [],
    evidence: [],
    explanation: 'Não há regras clínicas publicadas com revisão profissional, fonte auditável e testes independentes. Nenhuma hipótese, alerta, investigação ou opção terapêutica foi inferida.',
  }
}

export function assessClinicalCase(
  clinicalCase: ClinicalCase,
  knowledgeBase: ClinicalKnowledgeBase = clinicalKnowledgeBase,
): ClinicalAssessmentResult {
  const activeRules = knowledgeBase.rules.filter((rule) => isExecutable(rule, knowledgeBase))
  if (activeRules.length === 0) return emptyResult()

  const applicableRules = activeRules.filter((rule) => {
    if (rule.presentationIds.length > 0 && !rule.presentationIds.includes(clinicalCase.primaryPresentationId)) return false
    if (rule.appliesTo.careSettings.length > 0
      && clinicalCase.careSetting
      && !rule.appliesTo.careSettings.includes(clinicalCase.careSetting)) return false
    return true
  })

  const matchedRules: ClinicalRule[] = []
  const pendingPredicates: ClinicalRulePredicate[] = []
  const contextQuestions = new Map<string, ClinicalAssessmentResult['questions'][number]>()

  for (const rule of applicableRules) {
    if (rule.appliesTo.careSettings.length > 0 && !clinicalCase.careSetting) {
      contextQuestions.set(`careSetting:${rule.id}`, {
        inputId: 'careSetting',
        prompt: 'Em qual contexto assistencial ocorre a avaliação?',
        priority: 'high',
      })
      continue
    }

    if (rule.appliesTo.careSettings.length > 0 && !rule.appliesTo.careSettings.includes(clinicalCase.careSetting)) continue

    const exclusions = rule.notApplicableWhen.map((predicate) =>
      matchesPredicate(findObservation(clinicalCase, predicate.inputId), predicate),
    )
    if (exclusions.some((result) => result === true)) continue
    const unresolvedExclusions = rule.notApplicableWhen.filter((_, index) => exclusions[index] === null)
    if (unresolvedExclusions.length > 0) {
      pendingPredicates.push(...unresolvedExclusions)
      continue
    }

    const agePredicate = rule.appliesTo.minimumAgeYears !== undefined || rule.appliesTo.maximumAgeYears !== undefined
    const age = agePredicate ? findObservation(clinicalCase, 'ageYears') : null
    if (age?.state === 'known' && typeof age.value === 'number') {
      if (rule.appliesTo.minimumAgeYears !== undefined && age.value < rule.appliesTo.minimumAgeYears) continue
      if (rule.appliesTo.maximumAgeYears !== undefined && age.value > rule.appliesTo.maximumAgeYears) continue
    } else if (agePredicate) {
      pendingPredicates.push({
        id: `${rule.id}:age`,
        inputId: 'ageYears',
        operator: 'at_least',
        expectedValue: rule.appliesTo.minimumAgeYears ?? 0,
        question: { prompt: 'Qual é a idade?', priority: 'high' },
      })
      continue
    }

    let failed = false
    const missing: ClinicalRulePredicate[] = []
    for (const predicate of rule.allOf) {
      const matched = matchesPredicate(findObservation(clinicalCase, predicate.inputId), predicate)
      if (matched === false) {
        failed = true
        break
      }
      if (matched === null) missing.push(predicate)
    }

    if (failed) continue
    if (missing.length === 0) matchedRules.push(rule)
    else pendingPredicates.push(...missing)
  }

  const uniqueQuestions = new Map<string, ClinicalAssessmentResult['questions'][number]>()
  contextQuestions.forEach((question) => uniqueQuestions.set(question.inputId, question))
  for (const predicate of pendingPredicates) {
    if (!uniqueQuestions.has(predicate.inputId)) {
      uniqueQuestions.set(predicate.inputId, {
        inputId: predicate.inputId,
        prompt: predicate.question.prompt,
        priority: predicate.question.priority,
      })
    }
  }

  const matchedRuleIds = matchedRules.map(({ id }) => id)
  const hypothesisIds = new Set(matchedRules.flatMap(({ outcome }) => outcome.hypothesisIds))
  const investigationIds = new Set(matchedRules.flatMap(({ outcome }) => outcome.investigationIds))
  const treatmentOptionIds = new Set(matchedRules.flatMap(({ outcome }) => outcome.treatmentOptionIds))
  const severityFindings = matchedRules.flatMap(({ outcome }) => outcome.severityFindings)

  const hypotheses = knowledgeBase.hypotheses.filter(({ conditionId }) => hypothesisIds.has(conditionId))
  const investigations = knowledgeBase.investigations.filter(({ id }) => investigationIds.has(id))
  const pendingTreatmentPredicates: ClinicalRulePredicate[] = []
  const treatmentOptions = knowledgeBase.treatmentOptions.filter((option) => {
    if (!treatmentOptionIds.has(option.id)) return false

    let excluded = false
    let hasUnknownSafetyInputs = false
    for (const predicate of option.eligibilityPredicates) {
      const match = matchesPredicate(findObservation(clinicalCase, predicate.inputId), predicate)
      if (match === false) excluded = true
      if (match === null) {
        hasUnknownSafetyInputs = true
        pendingTreatmentPredicates.push(predicate)
      }
    }
    for (const predicate of option.contraindicationPredicates) {
      const match = matchesPredicate(findObservation(clinicalCase, predicate.inputId), predicate)
      if (match === true) excluded = true
      if (match === null) {
        hasUnknownSafetyInputs = true
        pendingTreatmentPredicates.push(predicate)
      }
    }
    return !excluded && !hasUnknownSafetyInputs
  })

  for (const predicate of pendingTreatmentPredicates) {
    if (!uniqueQuestions.has(predicate.inputId)) {
      uniqueQuestions.set(predicate.inputId, {
        inputId: predicate.inputId,
        prompt: predicate.question.prompt,
        priority: predicate.question.priority,
      })
    }
  }
  const evidence = new Map<string, ClinicalAssessmentResult['evidence'][number]>()
  matchedRules.forEach((rule) => rule.references.forEach((reference) => evidence.set(reference.id, reference)))
  hypotheses.forEach((hypothesis) => hypothesis.evidence.forEach((reference) => evidence.set(reference.id, reference)))
  investigations.forEach((investigation) => investigation.evidence.forEach((reference) => evidence.set(reference.id, reference)))
  treatmentOptions.forEach((option) => option.evidence.forEach((reference) => evidence.set(reference.id, reference)))

  const hasResults = matchedRules.length > 0
  const hasQuestions = uniqueQuestions.size > 0
  return {
    status: hasResults ? 'assessed' : hasQuestions ? 'pending_clinical_data' : 'insufficient_validated_content',
    severityFindings,
    hypotheses,
    investigations,
    treatmentOptions,
    matchedRuleIds,
    questions: [...uniqueQuestions.values()].sort((first, second) =>
      first.priority === second.priority ? 0 : first.priority === 'high' ? -1 : 1,
    ),
    evidence: [...evidence.values()],
    explanation: hasResults
      ? 'Resultados gerados exclusivamente por regras clínicas publicadas e aplicáveis. Revise critérios, limitações e referências antes de qualquer decisão.'
      : hasQuestions
        ? 'Há regras publicadas potencialmente aplicáveis, mas a avaliação depende de dados clínicos ainda não informados.'
        : 'Nenhuma regra clínica publicada se aplica aos dados informados. Isso não exclui risco ou doença; não há conclusão diagnóstica.',
  }
}
