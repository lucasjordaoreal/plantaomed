import type { ClinicalCase, VitalSignId } from '../types'

export const vitalSignDefinitions: Array<{
  id: VitalSignId
  label: string
  unit: string
  minimum: number
  maximum: number
}> = [
  { id: 'systolicPressure', label: 'Pressão arterial sistólica', unit: 'mmHg', minimum: 20, maximum: 400 },
  { id: 'diastolicPressure', label: 'Pressão arterial diastólica', unit: 'mmHg', minimum: 10, maximum: 300 },
  { id: 'heartRate', label: 'Frequência cardíaca', unit: 'bpm', minimum: 0, maximum: 400 },
  { id: 'respiratoryRate', label: 'Frequência respiratória', unit: 'irpm', minimum: 0, maximum: 100 },
  { id: 'oxygenSaturation', label: 'Saturação periférica de oxigênio', unit: '%', minimum: 0, maximum: 100 },
  { id: 'temperature', label: 'Temperatura', unit: '°C', minimum: 20, maximum: 50 },
  { id: 'capillaryGlucose', label: 'Glicemia capilar', unit: 'mg/dL', minimum: 0, maximum: 2000 },
]

export type VitalSignValidationError = {
  id: VitalSignId
  message: string
}

export function validateVitalSigns(clinicalCase: ClinicalCase): VitalSignValidationError[] {
  const errors: VitalSignValidationError[] = []

  for (const definition of vitalSignDefinitions) {
    const observation = clinicalCase.vitalSigns[definition.id]
    if (observation.state !== 'value') continue

    const value = Number(observation.value)
    if (!observation.value.trim() || !Number.isFinite(value)) {
      errors.push({ id: definition.id, message: 'Informe um valor numérico ou marque como desconhecido.' })
    } else if (value < definition.minimum || value > definition.maximum) {
      errors.push({
        id: definition.id,
        message: `Valor fora do intervalo técnico de entrada (${definition.minimum}–${definition.maximum} ${definition.unit}).`,
      })
    }
  }

  const systolic = clinicalCase.vitalSigns.systolicPressure
  const diastolic = clinicalCase.vitalSigns.diastolicPressure
  if (systolic.state === 'value' && diastolic.state === 'value') {
    const systolicValue = Number(systolic.value)
    const diastolicValue = Number(diastolic.value)
    if (Number.isFinite(systolicValue) && Number.isFinite(diastolicValue) && systolicValue < diastolicValue) {
      errors.push({
        id: 'systolicPressure',
        message: 'Confira os valores: a sistólica informada está abaixo da diastólica.',
      })
    }
  }

  return errors
}
