import { describe, expect, it } from 'vitest'
import { calculators } from './catalog'
import { calculate } from './engine'

describe('calculator engine', () => {
  it('matches independently calculated CKD-EPI reference examples', () => {
    const creatinine = calculate('ckd-epi-2021-creatinine', {
      age: '60',
      sex: 'female',
      creatinine: '1.0',
    })
    const combined = calculate('ckd-epi-2021-creatinine-cystatin', {
      age: '60',
      sex: 'female',
      creatinine: '1.0',
      cystatinC: '1.0',
    })
    const cystatin = calculate('ckd-epi-2012-cystatin', {
      age: '60',
      sex: 'female',
      cystatinC: '1.0',
    })

    expect(creatinine?.value).toBe('64,5')
    expect(combined?.value).toBe('71,2')
    expect(cystatin?.value).toBe('72,5')
    expect(creatinine?.unit).toBe('mL/min/1,73 m²')
  })

  it('matches independent Cockcroft–Gault, Mosteller and adult BMI examples', () => {
    expect(calculate('cockcroft-gault', {
      age: '60',
      sex: 'female',
      weight: '70',
      creatinine: '1',
    })?.value).toBe('66,1')
    expect(calculate('bsa-mosteller', { weight: '70', height: '175' })?.value).toBe('1,84')
    expect(calculate('bmi-adult', { age: '42', weight: '70', height: '175' })?.value).toBe('22,9')
  })

  it('scores qSOFA using inclusive published thresholds and reports each component', () => {
    const atThreshold = calculate('qsofa', {
      age: '18',
      alteredMentalStatus: 'yes',
      systolicPressure: '100',
      respiratoryRate: '22',
    })
    const belowThreshold = calculate('qsofa', {
      age: '18',
      alteredMentalStatus: 'no',
      systolicPressure: '101',
      respiratoryRate: '21',
    })

    expect(atThreshold?.value).toBe('3')
    expect(atThreshold?.components).toHaveLength(3)
    expect(belowThreshold?.value).toBe('0')
    expect(atThreshold?.interpretation).toContain('não deve ser usado isoladamente')
  })

  it('scores CRB-65 threshold values independently', () => {
    const atThreshold = calculate('crb-65', {
      age: '65',
      confusion: 'yes',
      respiratoryRate: '30',
      systolicPressure: '89',
      diastolicPressure: '61',
    })
    const belowThreshold = calculate('crb-65', {
      age: '64',
      confusion: 'no',
      respiratoryRate: '29',
      systolicPressure: '90',
      diastolicPressure: '61',
    })
    const diastolicThreshold = calculate('crb-65', {
      age: '64',
      confusion: 'no',
      respiratoryRate: '29',
      systolicPressure: '110',
      diastolicPressure: '60',
    })

    expect(atThreshold?.value).toBe('4')
    expect(belowThreshold?.value).toBe('0')
    expect(diastolicThreshold?.value).toBe('1')
  })

  it('counts the six RCRI factors with a strict creatinine threshold', () => {
    const atThreshold = calculate('rcri', {
      age: '50',
      highRiskSurgery: 'yes',
      ischemicHeartDisease: 'no',
      heartFailure: 'no',
      cerebrovascularDisease: 'no',
      insulinTreatment: 'no',
      creatinine: '2.0',
    })
    const aboveThreshold = calculate('rcri', {
      age: '50',
      highRiskSurgery: 'yes',
      ischemicHeartDisease: 'yes',
      heartFailure: 'yes',
      cerebrovascularDisease: 'yes',
      insulinTreatment: 'yes',
      creatinine: '2.01',
    })

    expect(atThreshold?.value).toBe('1')
    expect(aboveThreshold?.value).toBe('6')
    expect(calculate('rcri', {
      age: '49',
      highRiskSurgery: 'no',
      ischemicHeartDisease: 'no',
      heartFailure: 'no',
      cerebrovascularDisease: 'no',
      insulinTreatment: 'no',
      creatinine: '1',
    })).toBeNull()
  })

  it('converts FiO2 percent to a fraction and does not diagnose ARDS', () => {
    const result = calculate('pao2-fio2', { paO2: '80', fiO2: '40' })
    expect(result?.value).toBe('200')
    expect(result?.components[1]).toContain('0,4 em fração')
    expect(result?.interpretation).toContain('não estabelece diagnóstico')
    expect(calculate('pao2-fio2', { paO2: '80', fiO2: '20' })).toBeNull()
  })

  it('does not calculate missing, invalid or inapplicable inputs', () => {
    expect(calculate('bmi-adult', { age: '19', weight: '70', height: '175' })).toBeNull()
    expect(calculate('ckd-epi-2021-creatinine', { age: '17', sex: 'female', creatinine: '1' })).toBeNull()
    expect(calculate('cockcroft-gault', { age: '60', sex: 'female', weight: '70', creatinine: '0' })).toBeNull()
    expect(calculate('qsofa', { age: '20', systolicPressure: '100', respiratoryRate: '20' })).toBeNull()
    expect(calculate('qsofa', { age: '20', alteredMentalStatus: 'maybe', systolicPressure: '100', respiratoryRate: '20' })).toBeNull()
    expect(calculate('ckd-epi-2021-creatinine', { age: '60', sex: 'unknown', creatinine: '1' })).toBeNull()
    expect(calculate('ckd-epi-2021-creatinine', { age: '60.5', sex: 'female', creatinine: '1' })).toBeNull()
    expect(calculate('unknown-calculator', {})).toBeNull()
  })

  it('keeps reference, formula and clinical release status in the catalog', () => {
    expect(calculators).toHaveLength(10)
    for (const calculator of calculators) {
      expect(calculator.formula).not.toBe('')
      expect(calculator.references.length).toBeGreaterThan(0)
      expect(calculator.references.every(({ url }) => url.startsWith('https://'))).toBe(true)
      expect(calculator.automatedTestsIncluded).toBe(true)
      expect(calculator.clinicallyReviewed).toBe(false)
      expect(calculator.clinicallyReleased).toBe(false)
    }
  })
})
