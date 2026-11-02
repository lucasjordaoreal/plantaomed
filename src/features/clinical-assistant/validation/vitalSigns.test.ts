import { describe, expect, it } from 'vitest'
import type { ClinicalCase, VitalSignId } from '../types'
import { validateVitalSigns, vitalSignDefinitions } from './vitalSigns'

const createCase = (): ClinicalCase => ({
  ageYears: '',
  biologicalSex: 'not_informed',
  pregnancyStatus: 'unknown',
  weightKg: '',
  careSetting: '',
  comorbidities: '',
  currentMedications: '',
  allergies: '',
  primaryPresentationId: '',
  associatedPresentationIds: [],
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
    heartRate: { state: 'not_assessed', value: '' },
    respiratoryRate: { state: 'not_assessed', value: '' },
    oxygenSaturation: { state: 'not_assessed', value: '' },
    temperature: { state: 'not_assessed', value: '' },
    capillaryGlucose: { state: 'not_assessed', value: '' },
  },
  consciousness: 'not_assessed',
})

describe('clinical assistant vital sign input validation', () => {
  it('distinguishes unassessed and unknown observations from measured values', () => {
    const clinicalCase = createCase()
    clinicalCase.vitalSigns.heartRate = { state: 'unknown', value: '' }
    expect(validateVitalSigns(clinicalCase)).toEqual([])
  })

  it('requires a numeric value when a measurement is selected', () => {
    const clinicalCase = createCase()
    clinicalCase.vitalSigns.temperature = { state: 'value', value: '' }
    expect(validateVitalSigns(clinicalCase)).toEqual([
      { id: 'temperature', message: 'Informe um valor numérico ou marque como desconhecido.' },
    ])
  })

  it('checks technical input ranges and pressure value consistency', () => {
    const clinicalCase = createCase()
    clinicalCase.vitalSigns.oxygenSaturation = { state: 'value', value: '101' }
    clinicalCase.vitalSigns.systolicPressure = { state: 'value', value: '70' }
    clinicalCase.vitalSigns.diastolicPressure = { state: 'value', value: '90' }
    const errors = validateVitalSigns(clinicalCase)
    expect(errors.map(({ id }) => id)).toEqual(['oxygenSaturation', 'systolicPressure'])
  })

  it('documents units for each objective field', () => {
    const units = Object.fromEntries(vitalSignDefinitions.map(({ id, unit }) => [id, unit])) as Record<VitalSignId, string>
    expect(units).toEqual({
      systolicPressure: 'mmHg',
      diastolicPressure: 'mmHg',
      heartRate: 'bpm',
      respiratoryRate: 'irpm',
      oxygenSaturation: '%',
      temperature: '°C',
      capillaryGlucose: 'mg/dL',
    })
  })
})
