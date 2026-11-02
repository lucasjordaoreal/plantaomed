export type OfficialSource = {
  id: string
  name: string
  organization: string
  scope: string
  url: string
  pageCheckedAt: string
  note: string
}

export const officialSources: OfficialSource[] = [
  {
    id: 'ministerio-saude-pcdt',
    name: 'Protocolos Clínicos e Diretrizes Terapêuticas',
    organization: 'Ministério da Saúde',
    scope: 'PCDT, DDT, protocolos de uso e linhas de cuidado do SUS',
    url: 'https://www.gov.br/saude/pt-br/assuntos/pcdt',
    pageCheckedAt: '2026-11-02',
    note: 'Página institucional consultada; documentos individuais e vigência precisam ser verificados antes de vinculação a um protocolo.',
  },
  {
    id: 'conitec',
    name: 'Comissão Nacional de Incorporação de Tecnologias no SUS',
    organization: 'Ministério da Saúde / Conitec',
    scope: 'Recomendações de incorporação e avaliação de tecnologias no SUS',
    url: 'https://www.gov.br/conitec/pt-br',
    pageCheckedAt: '2026-11-02',
    note: 'Portal institucional consultado; não constitui, por si só, referência clínica vinculada aos registros atuais.',
  },
  {
    id: 'anvisa',
    name: 'Agência Nacional de Vigilância Sanitária',
    organization: 'Anvisa',
    scope: 'Regulação sanitária; registro e informações oficiais de medicamentos',
    url: 'https://www.gov.br/anvisa/pt-br',
    pageCheckedAt: '2026-11-02',
    note: 'Portal institucional consultado; nenhum registro de medicamento foi pesquisado ou confirmado nesta atualização.',
  },
  {
    id: 'dados-abertos-sus',
    name: 'Dados Abertos do SUS',
    organization: 'Ministério da Saúde',
    scope: 'Dados públicos de saúde',
    url: 'https://dadosabertos.saude.gov.br/',
    pageCheckedAt: '2026-11-02',
    note: 'Portal consultado; não fornece validação clínica automática dos conteúdos desta biblioteca.',
  },
]
