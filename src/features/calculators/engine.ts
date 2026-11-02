export type CalculatorValues = Record<string, string>

export type CalculatorResult = {
  value: string
  unit?: string
  classification?: string
  interpretation: string
  components: string[]
}

function numberValue(values: CalculatorValues, key: string): number | null {
  const raw = values[key]?.trim()
  if (!raw) return null
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

function requiredNumbers(values: CalculatorValues, keys: string[]): number[] | null {
  const parsed = keys.map((key) => numberValue(values, key))
  const numbers = parsed.filter((value): value is number => value !== null)
  return numbers.length === keys.length ? numbers : null
}

function resultNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value)
}

function validAdultAge(age: number): boolean {
  return Number.isInteger(age) && age >= 18
}

function validSex(value: string): value is 'female' | 'male' {
  return value === 'female' || value === 'male'
}

function egfr2021Creatinine(values: CalculatorValues): CalculatorResult | null {
  const age = numberValue(values, 'age')
  const creatinine = numberValue(values, 'creatinine')
  const sex = values.sex
  if (age === null || creatinine === null || !validSex(sex) || !validAdultAge(age) || creatinine <= 0) return null

  const female = sex === 'female'
  const kappa = female ? 0.7 : 0.9
  const alpha = female ? -0.241 : -0.302
  const ratio = creatinine / kappa
  const egfr = 142 * Math.pow(Math.min(ratio, 1), alpha)
    * Math.pow(Math.max(ratio, 1), -1.2)
    * Math.pow(0.9938, age)
    * (female ? 1.012 : 1)

  if (!Number.isFinite(egfr)) return null
  return {
    value: resultNumber(egfr),
    unit: 'mL/min/1,73 m²',
    interpretation: 'Estimativa de filtração glomerular indexada pela equação CKD-EPI 2021 baseada em creatinina. Não diagnostica doença renal crônica por resultado isolado.',
    components: [
      `Idade: ${resultNumber(age, 0)} anos`,
      `Creatinina sérica: ${resultNumber(creatinine, 2)} mg/dL`,
      `Variável sexual da equação: ${female ? 'feminina' : 'masculina'}`,
    ],
  }
}

function egfr2021CreatinineCystatin(values: CalculatorValues): CalculatorResult | null {
  const inputs = requiredNumbers(values, ['age', 'creatinine', 'cystatinC'])
  const sex = values.sex
  if (!inputs || !validSex(sex)) return null
  const [age, creatinine, cystatinC] = inputs
  if (!validAdultAge(age) || creatinine <= 0 || cystatinC <= 0) return null

  const female = sex === 'female'
  const kappa = female ? 0.7 : 0.9
  const alpha = female ? -0.219 : -0.144
  const creatinineRatio = creatinine / kappa
  const cystatinRatio = cystatinC / 0.8
  const egfr = 135
    * Math.pow(Math.min(creatinineRatio, 1), alpha)
    * Math.pow(Math.max(creatinineRatio, 1), -0.544)
    * Math.pow(Math.min(cystatinRatio, 1), -0.323)
    * Math.pow(Math.max(cystatinRatio, 1), -0.778)
    * Math.pow(0.9961, age)
    * (female ? 0.963 : 1)

  if (!Number.isFinite(egfr)) return null
  return {
    value: resultNumber(egfr),
    unit: 'mL/min/1,73 m²',
    interpretation: 'Estimativa de filtração glomerular indexada pela equação CKD-EPI 2021 baseada em creatinina e cistatina C. Não diagnostica doença renal crônica por resultado isolado.',
    components: [
      `Idade: ${resultNumber(age, 0)} anos`,
      `Creatinina sérica: ${resultNumber(creatinine, 2)} mg/dL`,
      `Cistatina C: ${resultNumber(cystatinC, 2)} mg/L`,
      `Variável sexual da equação: ${female ? 'feminina' : 'masculina'}`,
    ],
  }
}

function egfr2012Cystatin(values: CalculatorValues): CalculatorResult | null {
  const age = numberValue(values, 'age')
  const cystatinC = numberValue(values, 'cystatinC')
  const sex = values.sex
  if (age === null || cystatinC === null || !validSex(sex) || !validAdultAge(age) || cystatinC <= 0) return null

  const ratio = cystatinC / 0.8
  const egfr = 133
    * Math.pow(Math.min(ratio, 1), -0.499)
    * Math.pow(Math.max(ratio, 1), -1.328)
    * Math.pow(0.996, age)
    * (sex === 'female' ? 0.932 : 1)

  if (!Number.isFinite(egfr)) return null
  return {
    value: resultNumber(egfr),
    unit: 'mL/min/1,73 m²',
    interpretation: 'Estimativa de filtração glomerular indexada pela equação CKD-EPI 2012 baseada em cistatina C. Esta é uma versão diferente das equações CKD-EPI 2021.',
    components: [
      `Idade: ${resultNumber(age, 0)} anos`,
      `Cistatina C: ${resultNumber(cystatinC, 2)} mg/L`,
      `Variável sexual da equação: ${sex === 'female' ? 'feminina' : 'masculina'}`,
    ],
  }
}

function cockcroftGault(values: CalculatorValues): CalculatorResult | null {
  const inputs = requiredNumbers(values, ['age', 'weight', 'creatinine'])
  const sex = values.sex
  if (!inputs || !validSex(sex)) return null
  const [age, weight, creatinine] = inputs
  if (!validAdultAge(age) || weight <= 0 || creatinine <= 0) return null

  const clearance = ((140 - age) * weight) / (72 * creatinine) * (sex === 'female' ? 0.85 : 1)
  if (!Number.isFinite(clearance) || clearance < 0) return null
  return {
    value: resultNumber(clearance),
    unit: 'mL/min',
    interpretation: 'Estimativa de depuração de creatinina pela equação original de Cockcroft–Gault; não é eGFR indexada. A equação foi desenvolvida em adultos e pode ser inadequada fora de condições estáveis.',
    components: [
      `Idade: ${resultNumber(age, 0)} anos`,
      `Peso informado: ${resultNumber(weight, 1)} kg`,
      `Creatinina sérica: ${resultNumber(creatinine, 2)} mg/dL`,
      `Fator da equação: ${sex === 'female' ? '0,85' : '1,00'}`,
    ],
  }
}

function adultBmi(values: CalculatorValues): CalculatorResult | null {
  const inputs = requiredNumbers(values, ['age', 'weight', 'height'])
  if (!inputs) return null
  const [age, weight, heightCm] = inputs
  if (age < 20 || !Number.isInteger(age) || weight <= 0 || heightCm <= 0) return null

  const bmi = weight / ((heightCm / 100) ** 2)
  if (!Number.isFinite(bmi)) return null
  const classification = bmi < 18.5
    ? 'Abaixo do peso'
    : bmi < 25
      ? 'Faixa de peso saudável'
      : bmi < 30
        ? 'Sobrepeso'
        : bmi < 35
          ? 'Obesidade classe 1'
          : bmi < 40
            ? 'Obesidade classe 2'
            : 'Obesidade classe 3'
  return {
    value: resultNumber(bmi),
    unit: 'kg/m²',
    classification,
    interpretation: 'O IMC é uma medida de triagem baseada em peso e estatura; não mede diretamente composição ou distribuição de gordura e não substitui avaliação clínica.',
    components: [`Peso: ${resultNumber(weight, 1)} kg`, `Estatura: ${resultNumber(heightCm, 1)} cm`, `Idade: ${resultNumber(age, 0)} anos`],
  }
}

function mostellerBsa(values: CalculatorValues): CalculatorResult | null {
  const inputs = requiredNumbers(values, ['weight', 'height'])
  if (!inputs) return null
  const [weight, heightCm] = inputs
  if (weight <= 0 || heightCm <= 0) return null
  const bsa = Math.sqrt((heightCm * weight) / 3600)
  if (!Number.isFinite(bsa)) return null
  return {
    value: resultNumber(bsa, 2),
    unit: 'm²',
    interpretation: 'Superfície corporal estimada pela fórmula de Mosteller. É uma estimativa matemática e a fórmula não determina, por si só, doses ou condutas.',
    components: [`Peso: ${resultNumber(weight, 1)} kg`, `Estatura: ${resultNumber(heightCm, 1)} cm`],
  }
}

function qsofa(values: CalculatorValues): CalculatorResult | null {
  const inputs = requiredNumbers(values, ['age', 'systolicPressure', 'respiratoryRate'])
  const alteredMentalStatus = values.alteredMentalStatus
  if (!inputs || !alteredMentalStatus) return null
  const [age, systolicPressure, respiratoryRate] = inputs
  if (!validAdultAge(age) || systolicPressure <= 0 || respiratoryRate <= 0 || !['yes', 'no'].includes(alteredMentalStatus)) return null
  const components = [
    { name: 'Alteração do estado mental', points: alteredMentalStatus === 'yes' ? 1 : 0 },
    { name: 'Pressão arterial sistólica ≤ 100 mmHg', points: systolicPressure <= 100 ? 1 : 0 },
    { name: 'Frequência respiratória ≥ 22/min', points: respiratoryRate >= 22 ? 1 : 0 },
  ]
  const score = components.reduce((total, component) => total + component.points, 0)
  return {
    value: String(score),
    unit: 'pontos de 0 a 3',
    classification: score >= 2 ? 'Dois ou mais critérios presentes' : 'Menos de dois critérios presentes',
    interpretation: 'Em adultos com suspeita de infecção, dois ou mais critérios qSOFA estão associados a maior risco de desfechos desfavoráveis. qSOFA não diagnostica sepse e não deve ser usado isoladamente para triagem ou exclusão.',
    components: components.map(({ name, points }) => `${name}: ${points} ponto${points === 1 ? '' : 's'}`),
  }
}

function crb65(values: CalculatorValues): CalculatorResult | null {
  const inputs = requiredNumbers(values, ['age', 'respiratoryRate', 'systolicPressure', 'diastolicPressure'])
  const confusion = values.confusion
  if (!inputs || !confusion) return null
  const [age, respiratoryRate, systolicPressure, diastolicPressure] = inputs
  if (!validAdultAge(age) || respiratoryRate <= 0 || systolicPressure <= 0 || diastolicPressure <= 0 || !['yes', 'no'].includes(confusion)) return null
  const components = [
    { name: 'Confusão mental', points: confusion === 'yes' ? 1 : 0 },
    { name: 'Frequência respiratória ≥ 30/min', points: respiratoryRate >= 30 ? 1 : 0 },
    { name: 'Pressão sistólica < 90 ou diastólica ≤ 60 mmHg', points: systolicPressure < 90 || diastolicPressure <= 60 ? 1 : 0 },
    { name: 'Idade ≥ 65 anos', points: age >= 65 ? 1 : 0 },
  ]
  const score = components.reduce((total, component) => total + component.points, 0)
  return {
    value: String(score),
    unit: 'pontos de 0 a 4',
    interpretation: 'O CRB-65 foi desenvolvido para estratificação prognóstica em adultos com pneumonia adquirida na comunidade. O resultado não define sozinho local de tratamento ou conduta.',
    components: components.map(({ name, points }) => `${name}: ${points} ponto${points === 1 ? '' : 's'}`),
  }
}

function paO2FiO2(values: CalculatorValues): CalculatorResult | null {
  const inputs = requiredNumbers(values, ['paO2', 'fiO2'])
  if (!inputs) return null
  const [paO2, fio2Percent] = inputs
  if (paO2 <= 0 || fio2Percent < 21 || fio2Percent > 100) return null
  const ratio = paO2 / (fio2Percent / 100)
  if (!Number.isFinite(ratio)) return null
  return {
    value: resultNumber(ratio),
    unit: 'mmHg',
    interpretation: 'Relação PaO₂/FiO₂ calculada com FiO₂ convertida de porcentagem para fração. O valor isolado não estabelece diagnóstico de síndrome do desconforto respiratório agudo.',
    components: [`PaO₂: ${resultNumber(paO2, 1)} mmHg`, `FiO₂: ${resultNumber(fio2Percent, 1)}% (${resultNumber(fio2Percent / 100, 2)} em fração)`],
  }
}

function rcri(values: CalculatorValues): CalculatorResult | null {
  const age = numberValue(values, 'age')
  const requiredFlags = [
    'highRiskSurgery',
    'ischemicHeartDisease',
    'heartFailure',
    'cerebrovascularDisease',
    'insulinTreatment',
  ]
  const creatinine = numberValue(values, 'creatinine')
  if (age === null || !Number.isInteger(age) || age < 50 || creatinine === null || creatinine <= 0) return null
  if (requiredFlags.some((key) => !['yes', 'no'].includes(values[key]))) return null

  const components = [
    { key: 'highRiskSurgery', name: 'Cirurgia de alto risco' },
    { key: 'ischemicHeartDisease', name: 'Doença isquêmica do coração' },
    { key: 'heartFailure', name: 'Insuficiência cardíaca' },
    { key: 'cerebrovascularDisease', name: 'Doença cerebrovascular' },
    { key: 'insulinTreatment', name: 'Diabetes tratada com insulina' },
  ].map(({ key, name }) => ({ name, points: values[key] === 'yes' ? 1 : 0 }))
  components.push({
    name: 'Creatinina pré-operatória > 2,0 mg/dL',
    points: creatinine > 2 ? 1 : 0,
  })

  const score = components.reduce((total, component) => total + component.points, 0)
  return {
    value: String(score),
    unit: 'pontos de 0 a 6',
    interpretation: 'Índice de fatores de risco cardíaco perioperatório para cirurgia não cardíaca. A pontuação não substitui avaliação perioperatória individual e não deve ser convertida automaticamente em recomendação.',
    components: components.map(({ name, points }) => `${name}: ${points} ponto${points === 1 ? '' : 's'}`),
  }
}

const calculators: Record<string, (values: CalculatorValues) => CalculatorResult | null> = {
  'bmi-adult': adultBmi,
  'bsa-mosteller': mostellerBsa,
  'ckd-epi-2021-creatinine': egfr2021Creatinine,
  'ckd-epi-2021-creatinine-cystatin': egfr2021CreatinineCystatin,
  'ckd-epi-2012-cystatin': egfr2012Cystatin,
  'cockcroft-gault': cockcroftGault,
  qsofa,
  'crb-65': crb65,
  'pao2-fio2': paO2FiO2,
  rcri,
}

export function calculate(id: string, values: CalculatorValues): CalculatorResult | null {
  return calculators[id]?.(values) ?? null
}

export function parseCalculatorNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value.trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}
