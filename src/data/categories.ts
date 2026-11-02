import type { Category } from '../types'

export const categories: Category[] = [
  {
    id: 'cardiologia',
    name: 'Cardiologia',
    description: 'Condutas para dor torácica, IAM, arritmias e emergências cardiovasculares.',
    icon: 'HeartPulse',
    protocols: ['sindrome-coronariana-aguda', 'infarto-agudo-miocardio', 'arritmias', 'insuficiencia-cardiaca'],
  },
  {
    id: 'neurologia',
    name: 'Neurologia',
    description: 'Avaliação e condução de AVC, crise convulsiva e cefaleias de alerta.',
    icon: 'BrainCircuit',
    protocols: ['avc', 'convulsao', 'estado-mal-epileptico', 'cefaleias-alerta'],
  },
  {
    id: 'pneumologia',
    name: 'Pneumologia',
    description: 'Asma aguda, DPOC e tromboembolismo pulmonar.',
    icon: 'Stethoscope',
    protocols: ['asma-aguda', 'dpoc-exacerbada', 'tep', 'insuficiencia-respiratoria'],
  },
  {
    id: 'infectologia',
    name: 'Infectologia',
    description: 'Sepse, meningite e infecções de urgência.',
    icon: 'ShieldAlert',
    protocols: ['sepse', 'meningite', 'pneumonia', 'infeccao-urinaria'],
  },
  {
    id: 'endocrinologia',
    name: 'Endocrinologia',
    description: 'Hipoglicemia, cetoacidose e distúrbios eletrolíticos.',
    icon: 'Activity',
    protocols: ['hipoglicemia', 'cetoacidose-diabetica', 'disturbios-eletroliticos'],
  },
  {
    id: 'emergencias',
    name: 'Emergências',
    description: 'Parada cardiorrespiratória, choque, anafilaxia e intoxicações.',
    icon: 'AlertTriangle',
    protocols: ['parada-cardiopulmonar', 'choque', 'anafilaxia', 'intoxicacoes'],
  },
]
