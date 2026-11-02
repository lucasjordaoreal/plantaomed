export type CalculatorCategory =
  | 'Nefrologia'
  | 'Antropometria'
  | 'Emergência'
  | 'Pneumologia'
  | 'Cardiologia'

export type CalculatorField = {
  id: string
  label: string
  unit?: string
  inputMode?: 'decimal' | 'numeric'
  options?: { label: string; value: string }[]
  helpText?: string
}

export type CalculatorReference = {
  title: string
  organization: string
  year?: string
  url: string
}

export type CalculatorDefinition = {
  id: string
  name: string
  abbreviation: string
  category: CalculatorCategory
  specialty: string
  purpose: string
  population: string
  formula: string
  fields: CalculatorField[]
  limitations: string[]
  references: CalculatorReference[]
  synonyms: string[]
  automatedTestsIncluded: true
  clinicallyReviewed: false
  clinicallyReleased: false
}

const sexField: CalculatorField = {
  id: 'sex',
  label: 'Variável sexual utilizada pela equação',
  options: [
    { label: 'Feminina', value: 'female' },
    { label: 'Masculina', value: 'male' },
  ],
  helpText: 'As equações publicadas usam categorias binárias. Não selecione por inferência; se a equação não for aplicável, não interprete o resultado.',
}

const egfrReference: CalculatorReference = {
  title: 'Glomerular Filtration Rate Equations: Adults',
  organization: 'National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK)',
  url: 'https://www.niddk.nih.gov/research-funding/research-programs/kidney-clinical-research-epidemiology/laboratory/glomerular-filtration-rate-equations/adults',
}

export const calculatorCategories: CalculatorCategory[] = [
  'Emergência',
  'Cardiologia',
  'Nefrologia',
  'Pneumologia',
  'Antropometria',
]

export const calculators: CalculatorDefinition[] = [
  {
    id: 'rcri',
    name: 'Índice Cardíaco Revisado de Risco',
    abbreviation: 'RCRI',
    category: 'Cardiologia',
    specialty: 'Cardiologia e avaliação perioperatória',
    purpose: 'Contabilizar fatores do índice de risco cardíaco revisado antes de cirurgia não cardíaca.',
    population: 'Adultos com 50 anos ou mais avaliados antes de cirurgia eletiva não cardíaca de grande porte; população do estudo de derivação.',
    formula: '1 ponto para cada um: cirurgia de alto risco; doença isquêmica do coração; insuficiência cardíaca; doença cerebrovascular; diabetes tratada com insulina; creatinina pré-operatória > 2,0 mg/dL.',
    fields: [
      { id: 'age', label: 'Idade', unit: 'anos', inputMode: 'numeric' },
      { id: 'highRiskSurgery', label: 'Cirurgia classificada como de alto risco', options: [{ label: 'Não', value: 'no' }, { label: 'Sim', value: 'yes' }], helpText: 'Consulte a definição do instrumento e o contexto do procedimento; não classifique por inferência.' },
      { id: 'ischemicHeartDisease', label: 'Doença isquêmica do coração', options: [{ label: 'Não', value: 'no' }, { label: 'Sim', value: 'yes' }] },
      { id: 'heartFailure', label: 'Insuficiência cardíaca', options: [{ label: 'Não', value: 'no' }, { label: 'Sim', value: 'yes' }] },
      { id: 'cerebrovascularDisease', label: 'Doença cerebrovascular', options: [{ label: 'Não', value: 'no' }, { label: 'Sim', value: 'yes' }] },
      { id: 'insulinTreatment', label: 'Diabetes tratada com insulina', options: [{ label: 'Não', value: 'no' }, { label: 'Sim', value: 'yes' }] },
      { id: 'creatinine', label: 'Creatinina sérica pré-operatória', unit: 'mg/dL', inputMode: 'decimal' },
    ],
    limitations: [
      'Use apenas no contexto e população em que o índice foi desenvolvido; classificar cirurgia como alto risco exige conhecer a definição original.',
      'O estudo de derivação incluiu pacientes com 50 anos ou mais submetidos a procedimentos eletivos de grande porte; a aplicabilidade fora desse contexto não é presumida.',
      'O escore não substitui avaliação perioperatória completa nem recomenda automaticamente prosseguir, adiar ou modificar a cirurgia.',
      'Não foram exibidas probabilidades de eventos ou recomendações de manejo.',
    ],
    references: [{
      title: 'Derivation and prospective validation of a simple index for prediction of cardiac risk of major noncardiac surgery',
      organization: 'Circulation',
      year: '1999',
      url: 'https://pubmed.ncbi.nlm.nih.gov/10477528/',
    }],
    synonyms: ['risco cardíaco', 'cirurgia', 'perioperatório', 'índice cardíaco revisado'],
    automatedTestsIncluded: true,
    clinicallyReviewed: false,
    clinicallyReleased: false,
  },
  {
    id: 'qsofa',
    name: 'Quick SOFA',
    abbreviation: 'qSOFA',
    category: 'Emergência',
    specialty: 'Medicina de emergência e terapia intensiva',
    purpose: 'Pontuação de três critérios clínicos associada a risco de desfechos desfavoráveis em adultos com suspeita de infecção.',
    population: 'Adultos com suspeita de infecção; não é critério diagnóstico de sepse.',
    formula: '1 ponto para alteração do estado mental, pressão sistólica ≤ 100 mmHg e frequência respiratória ≥ 22/min.',
    fields: [
      { id: 'age', label: 'Idade', unit: 'anos', inputMode: 'numeric' },
      { id: 'alteredMentalStatus', label: 'Alteração do estado mental', options: [{ label: 'Não', value: 'no' }, { label: 'Sim', value: 'yes' }], helpText: 'Considere o critério de alteração do estado mental definido no Sepsis-3; não estime sem avaliação clínica.' },
      { id: 'systolicPressure', label: 'Pressão arterial sistólica', unit: 'mmHg', inputMode: 'decimal' },
      { id: 'respiratoryRate', label: 'Frequência respiratória', unit: '/min', inputMode: 'decimal' },
    ],
    limitations: [
      'Não confirma nem exclui sepse; não deve ser utilizado isoladamente como ferramenta de triagem.',
      'A aplicação deve considerar suspeita de infecção e avaliação clínica completa.',
    ],
    references: [{
      title: 'The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)',
      organization: 'JAMA',
      year: '2016',
      url: 'https://pubmed.ncbi.nlm.nih.gov/26903338/',
    }],
    synonyms: ['quick sofa', 'sepsis-3', 'sepse', 'estado mental', 'pressão sistólica'],
    automatedTestsIncluded: true,
    clinicallyReviewed: false,
    clinicallyReleased: false,
  },
  {
    id: 'crb-65',
    name: 'CRB-65',
    abbreviation: 'CRB-65',
    category: 'Emergência',
    specialty: 'Pneumologia e medicina de emergência',
    purpose: 'Escore prognóstico para pneumonia adquirida na comunidade em adultos.',
    population: 'Adultos com pneumonia adquirida na comunidade.',
    formula: '1 ponto por confusão, frequência respiratória ≥ 30/min, pressão sistólica < 90 ou diastólica ≤ 60 mmHg, e idade ≥ 65 anos.',
    fields: [
      { id: 'age', label: 'Idade', unit: 'anos', inputMode: 'numeric' },
      { id: 'confusion', label: 'Confusão mental', options: [{ label: 'Não', value: 'no' }, { label: 'Sim', value: 'yes' }] },
      { id: 'respiratoryRate', label: 'Frequência respiratória', unit: '/min', inputMode: 'decimal' },
      { id: 'systolicPressure', label: 'Pressão arterial sistólica', unit: 'mmHg', inputMode: 'decimal' },
      { id: 'diastolicPressure', label: 'Pressão arterial diastólica', unit: 'mmHg', inputMode: 'decimal' },
    ],
    limitations: [
      'Não determina isoladamente local de tratamento, necessidade de internação ou conduta.',
      'Não utilizar fora da população adulta com pneumonia adquirida na comunidade.',
    ],
    references: [{
      title: 'Defining community acquired pneumonia severity on presentation to hospital: an international derivation and validation study',
      organization: 'Thorax',
      year: '2003',
      url: 'https://pubmed.ncbi.nlm.nih.gov/12728155/',
    }],
    synonyms: ['pneumonia', 'risco', 'confusão', 'pressão arterial', 'frequência respiratória'],
    automatedTestsIncluded: true,
    clinicallyReviewed: false,
    clinicallyReleased: false,
  },
  {
    id: 'ckd-epi-2021-creatinine',
    name: 'CKD-EPI 2021 — creatinina',
    abbreviation: 'eGFRcr',
    category: 'Nefrologia',
    specialty: 'Nefrologia',
    purpose: 'Estimar a taxa de filtração glomerular em adultos com creatinina sérica padronizada.',
    population: 'Adultos com 18 anos ou mais; creatinina padronizada.',
    formula: '142 × min(SCr/κ,1)^α × max(SCr/κ,1)^−1,200 × 0,9938^idade × 1,012 (se feminina); κ e α dependem da variável sexual da equação.',
    fields: [
      { id: 'age', label: 'Idade', unit: 'anos', inputMode: 'numeric' },
      sexField,
      { id: 'creatinine', label: 'Creatinina sérica padronizada', unit: 'mg/dL', inputMode: 'decimal', helpText: 'Equação de adultos; converter µmol/L dividindo por 88,4.' },
    ],
    limitations: [
      'Não aplicar a menores de 18 anos nem interpretar em creatinina instável como medida direta da filtração.',
      'O resultado é indexado a 1,73 m²; não é depuração de creatinina nem estimativa não indexada.',
      'Um resultado isolado não diagnostica doença renal crônica; persistência e outros marcadores devem ser considerados.',
      'O NIDDK aponta que a equação combinada com cistatina C pode ser mais precisa em média.',
    ],
    references: [egfrReference],
    synonyms: ['filtração glomerular', 'função renal', 'creatinina', 'ckd epi 2021', 'eGFR'],
    automatedTestsIncluded: true,
    clinicallyReviewed: false,
    clinicallyReleased: false,
  },
  {
    id: 'ckd-epi-2021-creatinine-cystatin',
    name: 'CKD-EPI 2021 — creatinina e cistatina C',
    abbreviation: 'eGFRcr-cys',
    category: 'Nefrologia',
    specialty: 'Nefrologia',
    purpose: 'Estimar a taxa de filtração glomerular em adultos usando creatinina e cistatina C padronizadas.',
    population: 'Adultos com 18 anos ou mais; creatinina e cistatina C padronizadas.',
    formula: '135 × min(SCr/κ,1)^α × max(SCr/κ,1)^−0,544 × min(Scys/0,8,1)^−0,323 × max(Scys/0,8,1)^−0,778 × 0,9961^idade × 0,963 (se feminina).',
    fields: [
      { id: 'age', label: 'Idade', unit: 'anos', inputMode: 'numeric' },
      sexField,
      { id: 'creatinine', label: 'Creatinina sérica padronizada', unit: 'mg/dL', inputMode: 'decimal' },
      { id: 'cystatinC', label: 'Cistatina C padronizada', unit: 'mg/L', inputMode: 'decimal' },
    ],
    limitations: [
      'Não aplicar a menores de 18 anos nem interpretar em marcadores instáveis como medidas diretas da filtração.',
      'O resultado é indexado a 1,73 m² e não diagnostica doença renal crônica por si só.',
      'Não misturar com CKD-EPI 2012 de cistatina C isolada ou com CKD-EPI 2021 de creatinina isolada.',
    ],
    references: [egfrReference],
    synonyms: ['filtração glomerular', 'função renal', 'creatinina', 'cistatina c', 'ckd epi 2021 combinado'],
    automatedTestsIncluded: true,
    clinicallyReviewed: false,
    clinicallyReleased: false,
  },
  {
    id: 'ckd-epi-2012-cystatin',
    name: 'CKD-EPI 2012 — cistatina C',
    abbreviation: 'eGFRcys',
    category: 'Nefrologia',
    specialty: 'Nefrologia',
    purpose: 'Estimar a taxa de filtração glomerular em adultos usando cistatina C sérica padronizada.',
    population: 'Adultos com 18 anos ou mais; cistatina C padronizada.',
    formula: '133 × min(Scys/0,8,1)^−0,499 × max(Scys/0,8,1)^−1,328 × 0,996^idade × 0,932 (se feminina).',
    fields: [
      { id: 'age', label: 'Idade', unit: 'anos', inputMode: 'numeric' },
      sexField,
      { id: 'cystatinC', label: 'Cistatina C padronizada', unit: 'mg/L', inputMode: 'decimal' },
    ],
    limitations: [
      'Versão de 2012, distinta das equações CKD-EPI 2021.',
      'Não aplicar a menores de 18 anos nem interpretar em cistatina C instável como medida direta da filtração.',
      'O resultado é indexado a 1,73 m² e não diagnostica doença renal crônica por si só.',
    ],
    references: [egfrReference],
    synonyms: ['filtração glomerular', 'função renal', 'cistatina c', 'ckd epi 2012'],
    automatedTestsIncluded: true,
    clinicallyReviewed: false,
    clinicallyReleased: false,
  },
  {
    id: 'cockcroft-gault',
    name: 'Cockcroft–Gault',
    abbreviation: 'CrCl',
    category: 'Nefrologia',
    specialty: 'Nefrologia e farmacologia clínica',
    purpose: 'Estimar depuração de creatinina em adultos, sem indexação à superfície corporal.',
    population: 'Adultos em condição de creatinina estável.',
    formula: '((140 − idade) × peso em kg) / (72 × creatinina sérica em mg/dL); multiplicar por 0,85 para mulheres, conforme a equação original.',
    fields: [
      { id: 'age', label: 'Idade', unit: 'anos', inputMode: 'numeric' },
      sexField,
      { id: 'weight', label: 'Peso', unit: 'kg', inputMode: 'decimal' },
      { id: 'creatinine', label: 'Creatinina sérica', unit: 'mg/dL', inputMode: 'decimal' },
    ],
    limitations: [
      'Equação originalmente derivada em adultos; não aplicar a crianças ou em creatinina instável sem avaliação apropriada.',
      'A escolha do peso pode ser relevante em extremos de composição corporal; este cálculo utiliza o peso informado sem ajuste.',
      'Não usar isoladamente para selecionar ou ajustar medicamentos.',
    ],
    references: [{
      title: 'Prediction of creatinine clearance from serum creatinine',
      organization: 'Nephron',
      year: '1976',
      url: 'https://pubmed.ncbi.nlm.nih.gov/1244564/',
    }],
    synonyms: ['cockcroft gault', 'clearance de creatinina', 'depuração de creatinina', 'função renal'],
    automatedTestsIncluded: true,
    clinicallyReviewed: false,
    clinicallyReleased: false,
  },
  {
    id: 'bmi-adult',
    name: 'Índice de massa corporal — adultos',
    abbreviation: 'IMC',
    category: 'Antropometria',
    specialty: 'Antropometria',
    purpose: 'Calcular IMC e categoria de triagem para adultos a partir de peso e estatura.',
    population: 'Adultos com 20 anos ou mais; não usar categorias adultas para crianças/adolescentes.',
    formula: 'Peso (kg) / estatura (m)².',
    fields: [
      { id: 'age', label: 'Idade', unit: 'anos', inputMode: 'numeric' },
      { id: 'weight', label: 'Peso', unit: 'kg', inputMode: 'decimal' },
      { id: 'height', label: 'Estatura', unit: 'cm', inputMode: 'decimal' },
    ],
    limitations: [
      'Ferramenta de triagem: IMC não mede diretamente gordura corporal nem sua distribuição.',
      'Não utilizar as categorias adultas em crianças e adolescentes; gravidez, edema, massa muscular e outros contextos exigem interpretação específica.',
    ],
    references: [
      {
        title: 'About Body Mass Index (BMI)',
        organization: 'Centers for Disease Control and Prevention (CDC)',
        year: '2024',
        url: 'https://www.cdc.gov/bmi/about/index.html',
      },
      {
        title: 'Adult BMI Categories',
        organization: 'Centers for Disease Control and Prevention (CDC)',
        url: 'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html',
      },
    ],
    synonyms: ['índice de massa corporal', 'peso', 'estatura', 'obesidade', 'antropometria'],
    automatedTestsIncluded: true,
    clinicallyReviewed: false,
    clinicallyReleased: false,
  },
  {
    id: 'bsa-mosteller',
    name: 'Superfície corporal — Mosteller',
    abbreviation: 'SC',
    category: 'Antropometria',
    specialty: 'Antropometria',
    purpose: 'Estimar a superfície corporal a partir de peso e estatura.',
    population: 'Estimativa matemática de superfície corporal; interpretar conforme o contexto.',
    formula: '√(estatura em cm × peso em kg / 3600).',
    fields: [
      { id: 'weight', label: 'Peso', unit: 'kg', inputMode: 'decimal' },
      { id: 'height', label: 'Estatura', unit: 'cm', inputMode: 'decimal' },
    ],
    limitations: [
      'Estimativa baseada em fórmula; não equivale a uma medida direta da superfície corporal.',
      'Não define dose ou conduta automaticamente.',
    ],
    references: [{
      title: 'Simplified calculation of body-surface area',
      organization: 'New England Journal of Medicine',
      year: '1987',
      url: 'https://pubmed.ncbi.nlm.nih.gov/3657876/',
    }],
    synonyms: ['superfície corpórea', 'bsa', 'mosteller', 'antropometria'],
    automatedTestsIncluded: true,
    clinicallyReviewed: false,
    clinicallyReleased: false,
  },
  {
    id: 'pao2-fio2',
    name: 'Relação PaO₂/FiO₂',
    abbreviation: 'P/F',
    category: 'Pneumologia',
    specialty: 'Pneumologia e medicina intensiva',
    purpose: 'Calcular a relação entre pressão parcial arterial de oxigênio e fração inspirada de oxigênio.',
    population: 'Uso interpretativo em contexto respiratório; requer PaO₂ arterial e FiO₂ correspondente.',
    formula: 'PaO₂ (mmHg) / FiO₂ expressa como fração; a entrada em porcentagem é dividida por 100.',
    fields: [
      { id: 'paO2', label: 'PaO₂ arterial', unit: 'mmHg', inputMode: 'decimal' },
      { id: 'fiO2', label: 'FiO₂', unit: '% (21–100)', inputMode: 'decimal' },
    ],
    limitations: [
      'O resultado isolado não estabelece diagnóstico de SDRA; são necessários os demais critérios diagnósticos e contexto clínico.',
      'Utilize FiO₂ como porcentagem nesta interface; o cálculo converte para fração.',
    ],
    references: [{
      title: 'Acute Respiratory Distress Syndrome: The Berlin Definition',
      organization: 'JAMA',
      year: '2012',
      url: 'https://pubmed.ncbi.nlm.nih.gov/22797452/',
    }],
    synonyms: ['pafi', 'paO2 fio2', 'oxigenação', 'sdra', 'berlin'],
    automatedTestsIncluded: true,
    clinicallyReviewed: false,
    clinicallyReleased: false,
  },
]

export function normalizeCalculatorSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
