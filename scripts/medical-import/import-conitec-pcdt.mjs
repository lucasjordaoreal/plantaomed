import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const catalogUrl = 'https://www.gov.br/conitec/pt-br/assuntos/avaliacao-de-tecnologias-em-saude/protocolos-clinicos-e-diretrizes-terapeuticas/pcdt'
const sourceId = 'conitec-pcdt-catalog'

const entities = {
  amp: '&',
  apos: "'",
  nbsp: ' ',
  quot: '"',
  lt: '<',
  gt: '>',
  aacute: 'á',
  Aacute: 'Á',
  acirc: 'â',
  Acirc: 'Â',
  agrave: 'à',
  Agrave: 'À',
  atilde: 'ã',
  Atilde: 'Ã',
  auml: 'ä',
  Auml: 'Ä',
  ccedil: 'ç',
  Ccedil: 'Ç',
  eacute: 'é',
  Eacute: 'É',
  ecirc: 'ê',
  Ecirc: 'Ê',
  iacute: 'í',
  Iacute: 'Í',
  oacute: 'ó',
  Oacute: 'Ó',
  ocirc: 'ô',
  Ocirc: 'Ô',
  otilde: 'õ',
  Otilde: 'Õ',
  uacute: 'ú',
  Uacute: 'Ú',
  uuml: 'ü',
  Uuml: 'Ü',
  ndash: '–',
  mdash: '—',
  ordm: 'º',
  deg: '°',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
}

const normalize = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalize(value)
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

function decodeHtml(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const codePoint = entity[1].toLowerCase() === 'x'
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
    }
    return entities[entity] ?? match
  })
}

function textFromHtml(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function parseAttributes(value) {
  const attributes = {}
  for (const match of value.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[3])
  }
  return attributes
}

function parseRows(html) {
  const records = []
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1])
    if (cells.length < 2) continue
    const titleLinks = [...cells[0].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
      .map((match) => ({ attributes: parseAttributes(match[1]), title: textFromHtml(match[2]) }))
    const documentLink = titleLinks.find(({ attributes, title }) =>
      attributes.href?.includes('/midias/protocolos/') && title.length > 0,
    )
    if (!documentLink) continue
    const citation = textFromHtml(cells[1])
    const publicationMatch = citation.match(/publicada\s*(?:em)?\s*\(?\s*(\d{2})\/(\d{2})\/(\d{4})/i)
    const updatedMatch = citation.match(/anexo\s+alterado\s+em\s*(\d{2})\/(\d{2})\/(\d{4})/i)
    const portariaDateMatch = citation.match(/(?:-\s*|de\s*)(\d{2})\/(\d{2})\/(\d{4})/)
    const publicationDate = publicationMatch
      ? `${publicationMatch[3]}-${publicationMatch[2]}-${publicationMatch[1]}`
      : null
    const updatedAt = updatedMatch
      ? `${updatedMatch[3]}-${updatedMatch[2]}-${updatedMatch[1]}`
      : null
    const portariaDate = portariaDateMatch
      ? `${portariaDateMatch[3]}-${portariaDateMatch[2]}-${portariaDateMatch[1]}`
      : null

    records.push({
      title: documentLink.title,
      officialUrl: new URL(documentLink.attributes.href, catalogUrl).toString(),
      citation: citation || null,
      publicationDate,
      portariaDate,
      updatedAt,
    })
  }
  return records
}

const specialtyRules = [
  ['Toxicologia', /\b(acidentes escorpionicos|acidentes ofidicos|intoxicacao|envenenamento|toxicologia)\b/],
  ['Oncologia', /\b(cancer|carcinoma|neoplasia|tumor|linfoma|mieloma|leucemia|sarcoma|melanoma|gastrointestinal)\b/],
  ['Neurologia', /\b(acidente vascular cerebral|avc|epilepsia|esclerose multipla|parkinson|neuromielite|miastenia|distonia|distrofia muscular|atrofia muscular espinhal|cefaleia|migranea|alzheimer)\b/],
  ['Hematologia', /\b(anemia|hemofilia|talassemia|doenca falciforme|trombocitopenia|coagulopatia|sobrecarga de ferro|hemoglobinuria|hemolitica|von willebrand)\b/],
  ['Infectologia', /\b(infecc|hiv|aids|tuberculose|hepatite|hanseniase|leishmaniose|malaria|toxoplasmose|chagas|brucelose|dengue|febre|covid|citomegalovirus|meningite|pneumocistose|fungica|antimicrobiano|ist)\b/],
  ['Endocrinologia', /\b(diabetes|acromegalia|hipotireoidismo|hipertireoidismo|adrenal|hipofis|obesidade|osteoporose|hiperparatireoidismo|hipoparatireoidismo|hiperprolactinemia|puberdade precoce|raquitismo|osteomalacia|paget|sindrome de turner|dislipidemia|fenilcetonuria|deficiencia de hormonio)\b/],
  ['Reumatologia', /\b(artrite|lupus|vasculite|esclerose sistemica|espondilite|espondiloartrite|psori|dermatomiosite|miopatias?|esclerodermia|gota)\b/],
  ['Pneumologia', /\b(asma|pulmonar|pulmao|fibrose cistica|doenca pulmonar|dpoc|bronquiectasia|hipertensao pulmonar|linfangioleiomiomatose|tabagismo|deficiencia de alfa-1)\b/],
  ['Nefrologia', /\b(renal|rim|glomerul|sindrome nefrotica|doenca renal|insuficiencia renal)\b/],
  ['Gastroenterologia', /\b(crohn|colite|gastro|intestino|doenca celiaca|hepatica|cirrose|hepatopatia|colangite|transplante hepatico|pancreatica|pancreatite|refluxo|retocolite|hepatite)\b/],
  ['Pediatria', /\b(juvenil|crianca|criancas|neonat|pediatr|infantil|recem-nascido|biotinidase|homocistinuria|osteogenese imperfeita|lipofuscinose|sindrome de turner|fibrose cistica)\b/],
  ['Psiquiatria', /\b(transtorno mental|bipolar|esquizofrenia|depressao|deficit de atencao|tdah|autismo|esquizoafetivo|dependencia quimica)\b/],
  ['Imunologia e Alergologia', /\b(imunodeficiencia|angioedema|alerg|imunoglobulina)\b/],
  ['Oftalmologia', /\b(uveites?|retinopatia|retin|glaucoma|oftalm|degeneracao macular)\b/],
  ['Dermatologia', /\b(dermat\w*|psoriase|ictioses?|acne|pemfigo|hidradenite|vitiligo)\b/],
  ['Ginecologia e Obstetrícia', /\b(endometriose|gestacao|gestantes|gravidez|obstetric|ginecol|leiomioma|mioma|ovarios?|contracepc|tromboembolismo venoso)\b/],
  ['Cardiologia', /\b(cardiac|cardiop|transplante cardiaco|hipertensao arterial|insuficiencia cardiaca|arritmia|hipercolesterolemia familial|dislipidemia)\b/],
  ['Anestesiologia / Medicina da Dor', /\b(dor cronica)\b/],
  ['Neurologia', /\b(ela|esclerose lateral amiotrofica|distonia|espasticidade|guillain-barre|hemifacial|miopatia|lipofuscinose)\b/],
  ['Hematologia', /\b(falencia medular|sindrome mielodisplasica|porfirias?)\b/],
  ['Urologia', /\b(urolog|prostata|bexiga|incontinencia urinaria|hiperplasia prostatica)\b/],
  ['Clínica Médica', /\b(amiloidose|porfiria|doenca de gaucher|mucopolissacaridose|doenca de fabry|doenca de pompe|doencas raras|doenca de wilson|hipofosfatasia|hemocromatose)\b/],
]

function classifySpecialty(title, existing) {
  if (existing && (!existing.specialtyClassification || existing.specialtyClassification === 'existing_catalog_mapping')) {
    return { specialty: existing.specialty, classification: 'existing_catalog_mapping' }
  }
  const normalizedTitle = normalize(title)
  const match = specialtyRules.find(([, pattern]) => pattern.test(normalizedTitle))
  return match
    ? { specialty: match[0], classification: 'title_keyword_match' }
    : { specialty: 'Especialidade não classificada', classification: 'unclassified' }
}

function dateIsValid(value) {
  if (!value) return true
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

async function main() {
  const response = await fetch(catalogUrl, { redirect: 'follow' })
  if (!response.ok) throw new Error(`Conitec catalog request failed (HTTP ${response.status}).`)
  const html = await response.text()
  const currentDocuments = JSON.parse(await readFile(resolve(scriptDirectory, 'data/documents.json'), 'utf8'))
  const currentByTitle = new Map(currentDocuments.map((document) => [normalize(document.title), document]))
  const parsedRows = parseRows(html)
  const uniqueDocuments = new Map()
  for (const row of parsedRows) {
    const key = row.officialUrl.toLocaleLowerCase('pt-BR')
    if (!uniqueDocuments.has(key)) uniqueDocuments.set(key, row)
  }
  const retrievedAt = new Date().toISOString().slice(0, 10)
  const ids = new Set()
  const documents = [...uniqueDocuments.values()].map((row) => {
    const existing = currentByTitle.get(normalize(row.title))
    const mapped = classifySpecialty(row.title, existing)
    let id = existing?.id ?? `pcdt-${slugify(row.title)}`
    if (ids.has(id)) id = `${id}-${createHash('sha1').update(row.officialUrl).digest('hex').slice(0, 8)}`
    ids.add(id)
    return {
      id,
      title: row.title,
      organization: 'Ministério da Saúde / Conitec',
      specialty: mapped.specialty,
      specialtyClassification: mapped.classification,
      type: 'PCDT',
      publicationDate: row.publicationDate,
      portariaDate: row.portariaDate,
      version: row.citation,
      updatedAt: row.updatedAt,
      officialUrl: row.officialUrl,
      sourceId,
    }
  }).sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))

  const invalidRecords = documents.filter((document) =>
    !document.title || !document.officialUrl.startsWith('https://www.gov.br/conitec/')
      || !dateIsValid(document.publicationDate) || !dateIsValid(document.portariaDate) || !dateIsValid(document.updatedAt),
  )
  if (invalidRecords.length > 0) {
    throw new Error(`Conitec import produced ${invalidRecords.length} invalid document metadata records.`)
  }
  if (documents.length === 0) throw new Error('No PCDT records were found in the official catalog HTML.')

  const manifest = {
    sourceUrl: catalogUrl,
    retrievedAt,
    recordsReadFromCatalog: parsedRows.length,
    recordsImported: documents.length,
    duplicateRowsRemoved: parsedRows.length - documents.length,
    recordsWithoutPublicationDate: documents.filter((document) => !document.publicationDate).length,
    recordsWithSpecialtyKeywordClassification: documents.filter((document) => document.specialtyClassification === 'title_keyword_match').length,
    recordsWithoutSpecialtyClassification: documents.filter((document) => document.specialtyClassification === 'unclassified').length,
  }
  await writeFile(resolve(scriptDirectory, 'data/documents.json'), `${JSON.stringify(documents, null, 2)}\n`, 'utf8')
  await writeFile(resolve(scriptDirectory, 'data/conitec-import-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  const sourcesPath = resolve(scriptDirectory, 'data/sources.json')
  const sources = JSON.parse(await readFile(sourcesPath, 'utf8'))
  const source = sources.find((record) => record.id === sourceId)
  if (!source) throw new Error(`The source ${sourceId} must be registered before importing PCDTs.`)
  source.checkedAt = retrievedAt
  await writeFile(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`, 'utf8')

  const table = documents.map((document) =>
    `| ${document.title.replaceAll('|', '\\|')} | ${document.specialty} | ${document.publicationDate ?? 'Não listada'} | ${document.version?.replaceAll('|', '\\|') ?? 'Não listada'} | [Documento](${document.officialUrl}) |`,
  ).join('\n')
  await writeFile(resolve(scriptDirectory, '../../docs/CONITEC_IMPORT_REPORT.md'), [
    '# Importação do catálogo de PCDT da Conitec',
    '',
    `Fonte: [catálogo oficial PCDT](${catalogUrl})`,
    `Consulta e geração: ${retrievedAt}.`,
    '',
    `- Linhas de PCDT encontradas no catálogo: ${manifest.recordsReadFromCatalog}`,
    `- Links únicos importados: ${manifest.recordsImported}`,
    `- Duplicações de link removidas: ${manifest.duplicateRowsRemoved}`,
    `- Registros sem data de publicação explícita: ${manifest.recordsWithoutPublicationDate}`,
    `- Especialidades atribuídas por correspondência de título (triagem temática, não revisão clínica): ${manifest.recordsWithSpecialtyKeywordClassification}`,
    `- Registros sem especialidade inferível por regra: ${manifest.recordsWithoutSpecialtyClassification}`,
    '- Portarias e URLs são metadados reproduzidos da listagem; vigência e conteúdo clínico de cada documento não foram verificados individualmente.',
    '- A classificação temática automática é identificada nos dados e não deve ser interpretada como especialidade validada por revisão profissional.',
    '',
    '| Assunto | Especialidade | Publicação listada | Referência normativa listada | Link oficial |',
    '|---|---|---|---|---|',
    table,
    '',
  ].join('\n'), 'utf8')

  console.log(JSON.stringify({ ...manifest, specialtyCounts: Object.fromEntries(
    [...new Set(documents.map((document) => document.specialty))]
      .sort((left, right) => left.localeCompare(right, 'pt-BR'))
      .map((specialty) => [specialty, documents.filter((document) => document.specialty === specialty).length]),
  ) }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
