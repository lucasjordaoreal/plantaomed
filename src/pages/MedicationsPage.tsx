import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Pill, Search } from 'lucide-react'
import {
  getMedicineManifest,
  getMedicineRecordPack,
  getMedicineSearchIndex,
} from '../lib/medicineCatalog'
import type {
  MedicineImportManifest,
  MedicineRecord,
  MedicineSearchIndex,
  MedicineSearchRecord,
} from '../types'
import { SharePageButton } from '../components/SharePageButton'

const medicationSources = [
  {
    title: 'Consulta de medicamentos registrados',
    organization: 'Anvisa',
    detail: 'Consulta oficial para conferir situação e dados de um produto.',
    url: 'https://consultas.anvisa.gov.br/#/medicamentos/',
  },
  {
    title: 'Dados abertos de medicamentos',
    organization: 'Anvisa',
    detail: 'Arquivo oficial usado neste catálogo; atualizado mensalmente pela fonte.',
    url: 'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv',
  },
  {
    title: 'Dicionário do conjunto de dados',
    organization: 'Anvisa',
    detail: 'Definições oficiais dos campos, formato e periodicidade de atualização.',
    url: 'https://dados.anvisa.gov.br/dados/Documentacao_e_Dicionario_de_Dados_Registros_Validos_Medicamento_V1.pdf',
  },
  {
    title: 'Bulário Eletrônico',
    organization: 'Anvisa',
    detail: 'Acesso às bulas disponibilizadas pela autoridade sanitária.',
    url: 'https://consultas.anvisa.gov.br/#/bulario/',
  },
  {
    title: 'Rename',
    organization: 'Ministério da Saúde',
    detail: 'Relação Nacional de Medicamentos Essenciais e informações do SUS.',
    url: 'https://www.gov.br/saude/pt-br/composicao/sectics/daf/rename',
  },
]

const normalize = (value: string): string =>
  value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function recordMatches(record: MedicineSearchRecord, query: string): boolean {
  return normalize([
    record.productName,
    record.activeIngredient ?? '',
    record.registrationNumber ?? '',
    record.holder ?? '',
    record.regulatoryCategory ?? '',
    record.therapeuticClass ?? '',
    record.registrationSituation ?? '',
  ].join(' ')).includes(query)
}

export function MedicationsPage() {
  const [manifest, setManifest] = useState<MedicineImportManifest | null>(null)
  const [manifestError, setManifestError] = useState('')
  const [query, setQuery] = useState('')
  const [searchIndex, setSearchIndex] = useState<MedicineSearchIndex | null>(null)
  const [searchError, setSearchError] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<MedicineSearchRecord | null>(null)
  const [recordPacks, setRecordPacks] = useState(() => new Map<string, MedicineRecord[]>())
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let active = true
    getMedicineManifest()
      .then((result) => {
        if (active) setManifest(result)
      })
      .catch((error: unknown) => {
        if (active) setManifestError(error instanceof Error ? error.message : 'Erro inesperado ao carregar a origem dos medicamentos.')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!manifest || normalize(query).length < 2 || searchIndex) return
    let active = true
    getMedicineSearchIndex(manifest.searchIndexPath)
      .then((result) => {
        if (active) setSearchIndex(result)
      })
      .catch((error: unknown) => {
        if (active) setSearchError(error instanceof Error ? error.message : 'Erro inesperado ao pesquisar medicamentos.')
      })
    return () => {
      active = false
    }
  }, [manifest, query, searchIndex])

  useEffect(() => {
    if (!selectedRecord || recordPacks.has(selectedRecord.pack)) return
    let active = true
    getMedicineRecordPack(selectedRecord.pack)
      .then((pack) => {
        if (active) setRecordPacks((current) => new Map(current).set(selectedRecord.pack, pack.records))
      })
      .catch((error: unknown) => {
        if (active) setDetailError(error instanceof Error ? error.message : 'Erro inesperado ao carregar o registro.')
      })
    return () => {
      active = false
    }
  }, [selectedRecord, recordPacks])

  const normalizedQuery = normalize(query)
  const matchedRecords = useMemo(() => {
    if (!searchIndex || normalizedQuery.length < 2) return []
    return searchIndex.records.filter((record) => recordMatches(record, normalizedQuery))
  }, [searchIndex, normalizedQuery])
  const results = matchedRecords.slice(0, 100)
  const detail: MedicineRecord | null = selectedRecord
    ? recordPacks.get(selectedRecord.pack)?.find((record) => record.id === selectedRecord.id) ?? null
    : null
  const searchLoading = Boolean(manifest && normalizedQuery.length >= 2 && !searchIndex && !searchError)
  const detailLoading = Boolean(selectedRecord && !recordPacks.has(selectedRecord.pack) && !detailError)

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--actions">
        <div>
          <span className="eyebrow"><Pill size={14} aria-hidden="true" /> Consulta farmacológica</span>
          <h1 data-page-heading tabIndex={-1}>Medicamentos</h1>
          <p>Pesquisa em metadados do conjunto aberto de medicamentos registrados da Anvisa. A situação é reproduzida como publicada na fonte; confirme dados vigentes na consulta oficial.</p>
        </div>
        <SharePageButton />
      </header>

      <section className="medications-panel" aria-labelledby="medicine-catalog-title">
        <h2 id="medicine-catalog-title">Catálogo de registros da Anvisa</h2>
        {manifest && (
          <p>
            {manifest.recordsImported.toLocaleString('pt-BR')} registros catalogados · fonte consultada em {manifest.retrievedAt}.
            {' '}A base não informa disponibilidade comercial; este catálogo não fornece prescrição ou posologia.
          </p>
        )}
        {!manifest && !manifestError && <p role="status">Carregando a origem do catálogo…</p>}
        {manifestError && <p className="catalog-error" role="alert">{manifestError}</p>}
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Buscar medicamentos por nome, princípio ativo ou número de registro</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSelectedRecord(null)
              setSearchError('')
              setDetailError('')
            }}
            placeholder="Nome, princípio ativo ou número do registro"
          />
        </label>

        {query.trim().length > 0 && normalize(query).length < 2 && <p className="empty-state">Digite pelo menos dois caracteres para pesquisar.</p>}
        {searchLoading && <p role="status">Carregando o índice de busca…</p>}
        {searchError && <p className="catalog-error" role="alert">{searchError}</p>}
        {searchIndex && normalizedQuery.length >= 2 && (
          <div className="catalog-browser medicine-catalog-browser">
            <div className="catalog-results" aria-live="polite">
              <p className="catalog-results__count">
                {matchedRecords.length.toLocaleString('pt-BR')} resultados
                {' '}· exibindo até {results.length.toLocaleString('pt-BR')}
              </p>
              {results.map((record) => (
                <button
                  type="button"
                  key={record.id}
                  className={`catalog-result${selectedRecord?.id === record.id ? ' is-selected' : ''}`}
                  onClick={() => {
                    setSelectedRecord(record)
                    setDetailError('')
                  }}
                  aria-pressed={selectedRecord?.id === record.id}
                >
                  <strong>{record.productName}</strong>
                  <span>{record.activeIngredient ?? 'Princípio ativo não informado'} · Registro {record.registrationNumber ?? 'não informado'}</span>
                </button>
              ))}
              {results.length === 0 && <p className="empty-state">Nenhum registro corresponde à busca.</p>}
            </div>

            <article className="catalog-document">
              {detail ? (
                <>
                  <span className="eyebrow">{detail.regulatoryCategory ?? 'Categoria não informada'}</span>
                  <h3>{detail.productName}</h3>
                  <dl>
                    <div><dt>Princípio ativo</dt><dd>{detail.activeIngredient ?? 'Não informado na fonte'}</dd></div>
                    <div><dt>Número de registro</dt><dd>{detail.registrationNumber ?? 'Não informado na fonte'}</dd></div>
                    <div><dt>Situação publicada pela Anvisa</dt><dd>{detail.registrationSituation ?? 'Não informada na fonte'}</dd></div>
                    <div><dt>Titular do registro</dt><dd>{detail.holder ?? 'Não informado na fonte'}{detail.holderCnpj ? ` · CNPJ ${detail.holderCnpj}` : ''}</dd></div>
                    <div><dt>Classe terapêutica</dt><dd>{detail.therapeuticClass ?? 'Não informada na fonte'}</dd></div>
                    <div><dt>Número do processo</dt><dd>{detail.processNumber ?? 'Não informado na fonte'}</dd></div>
                    <div><dt>Finalização do processo</dt><dd>{detail.processFinalizedAt ?? 'Não informada na fonte'}</dd></div>
                    <div><dt>Campo de vencimento do registro</dt><dd>{detail.registrationExpirationField ?? 'Não informado na fonte'} · valor bruto da fonte</dd></div>
                    <div><dt>Origem e consulta</dt><dd>Anvisa · {manifest?.retrievedAt}</dd></div>
                  </dl>
                  <p className="empty-state">Registro em base aberta; não representa confirmação individual atual, estoque ou disponibilidade comercial. Consulte a Anvisa antes de usar estes metadados.</p>
                  <a className="action-button catalog-official-link" href={medicationSources[0].url} target="_blank" rel="noreferrer">
                    Conferir na consulta oficial da Anvisa <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </>
              ) : detailLoading ? (
                <p role="status">Carregando os detalhes do registro…</p>
              ) : detailError ? (
                <p className="catalog-error" role="alert">{detailError}</p>
              ) : selectedRecord ? (
                <p className="catalog-error" role="alert">O registro selecionado não foi encontrado no pacote de origem.</p>
              ) : (
                <p className="empty-state">Selecione um produto para consultar os campos publicados pela Anvisa.</p>
              )}
            </article>
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-heading"><div><span className="eyebrow">Referências regulatórias</span><h2>Fontes oficiais</h2></div></div>
        <div className="official-source-grid">
          {medicationSources.map((source) => (
            <a key={source.title} href={source.url} target="_blank" rel="noreferrer" className="official-source-card">
              <span className="eyebrow">{source.organization}</span>
              <strong>{source.title}</strong>
              <small>{source.detail}</small>
              <span className="source-card-link">Abrir fonte <ExternalLink size={14} aria-hidden="true" /></span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
