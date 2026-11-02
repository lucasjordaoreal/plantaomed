import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(scriptDirectory, '../..')
const sourceUrl = 'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv'
const dictionaryUrl = 'https://dados.anvisa.gov.br/dados/Documentacao_e_Dicionario_de_Dados_Registros_Validos_Medicamento_V1.pdf'
const sourceId = 'anvisa-open-medicines-csv'
const header = [
  'TIPO_PRODUTO',
  'NOME_PRODUTO',
  'DATA_FINALIZACAO_PROCESSO',
  'CATEGORIA_REGULATORIA',
  'NUMERO_REGISTRO_PRODUTO',
  'DATA_VENCIMENTO_REGISTRO',
  'NUMERO_PROCESSO',
  'CLASSE_TERAPEUTICA',
  'EMPRESA_DETENTORA_REGISTRO',
  'SITUACAO_REGISTRO',
  'PRINCIPIO_ATIVO',
]

const clean = (value) => value.trim().replace(/\s+/g, ' ')
const normalize = (value) =>
  clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')

function parseArguments() {
  const args = process.argv.slice(2)
  const inputIndex = args.indexOf('--input')
  if (inputIndex === -1) return null
  if (!args[inputIndex + 1]) throw new Error('--input requires a CSV file path.')
  return resolve(args[inputIndex + 1])
}

async function downloadSource(path) {
  const response = await fetch(sourceUrl, { redirect: 'follow' })
  if (!response.ok || !response.body) {
    throw new Error(`Anvisa CSV download failed (HTTP ${response.status}).`)
  }
  await mkdir(dirname(path), { recursive: true })
  await pipeline(Readable.fromWeb(response.body), createWriteStream(path))
}

async function forEachCsvRow(path, onRow) {
  const hash = createHash('sha256')
  const decoder = new TextDecoder('windows-1252')
  let textBuffer = ''
  let currentField = ''
  let currentRow = []
  let quoted = false
  let rowCount = 0
  let headerRow = null

  const processText = (text, finalChunk = false) => {
    textBuffer += text
    let index = 0

    while (index < textBuffer.length) {
      const character = textBuffer[index]
      if (quoted) {
        if (character === '"') {
          if (index + 1 === textBuffer.length && !finalChunk) break
          if (textBuffer[index + 1] === '"') {
            currentField += '"'
            index += 2
            continue
          }
          quoted = false
        } else {
          currentField += character
        }
      } else if (character === '"' && currentField.length === 0) {
        quoted = true
      } else if (character === ';') {
        currentRow.push(currentField)
        currentField = ''
      } else if (character === '\n' || character === '\r') {
        if (character === '\r' && textBuffer[index + 1] === '\n') index += 1
        currentRow.push(currentField)
        currentField = ''
        if (currentRow.some((field) => field.length > 0)) {
          if (headerRow === null) {
            headerRow = currentRow
            if (headerRow.length !== header.length || header.some((name, column) => headerRow[column] !== name)) {
              throw new Error(`Unexpected Anvisa CSV header: ${headerRow.join(';')}`)
            }
          } else {
            rowCount += 1
            onRow(currentRow)
          }
        }
        currentRow = []
      } else {
        currentField += character
      }
      index += 1
    }

    textBuffer = textBuffer.slice(index)
    if (finalChunk && quoted) throw new Error('Unclosed quoted field at the end of the Anvisa CSV.')
    if (finalChunk && textBuffer.length > 0) {
      currentField += textBuffer
      textBuffer = ''
    }
  }

  for await (const chunk of createReadStream(path)) {
    hash.update(chunk)
    processText(decoder.decode(chunk, { stream: true }))
  }
  processText(decoder.decode(), true)
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    if (headerRow === null) throw new Error('Anvisa CSV is empty.')
    rowCount += 1
    onRow(currentRow)
  }
  if (headerRow === null) throw new Error('Anvisa CSV is empty.')
  return { hash: hash.digest('hex'), rowCount }
}

function mapRecord(row) {
  if (row.length !== header.length) return null
  const fields = row.map(clean)
  const [productType, name, finalizedAt, category, registrationNumber, expirationField, processNumber, therapeuticClass, holderRaw, sourceStatus, activeIngredient] = fields
  if (!name || productType !== 'MEDICAMENTO') return null

  const recordId = createHash('sha256').update(JSON.stringify(fields)).digest('hex').slice(0, 24)
  const holderMatch = holderRaw.match(/^(\d{14})\s*-\s*(.*)$/)
  const letter = normalize(name).charAt(0)
  const shardId = /^[a-z0-9]$/.test(letter) ? letter : 'outros'
  return {
    id: recordId,
    productName: name,
    activeIngredient: activeIngredient || null,
    registrationNumber: registrationNumber || null,
    processNumber: processNumber || null,
    holder: holderMatch ? clean(holderMatch[2]) || null : holderRaw || null,
    holderCnpj: holderMatch?.[1] ?? null,
    regulatoryCategory: category || null,
    therapeuticClass: therapeuticClass || null,
    registrationSituation: sourceStatus || null,
    processFinalizedAt: finalizedAt || null,
    registrationExpirationField: expirationField || null,
    productType,
    sourceId,
    pack: `medicines/packs/${shardId}.json`,
  }
}

async function main() {
  const inputPath = parseArguments()
  const csvPath = inputPath ?? resolve(scriptDirectory, 'downloads/DADOS_ABERTOS_MEDICAMENTOS.csv')
  if (!inputPath) await downloadSource(csvPath)
  const csvInfo = await stat(csvPath)
  const outputDirectory = resolve(projectDirectory, 'public/data/medical-library/medicines')
  const packDirectory = resolve(outputDirectory, 'packs')
  await mkdir(packDirectory, { recursive: true })

  const seen = new Set()
  const packs = new Map()
  const searchRecords = []
  let duplicatesRemoved = 0
  let rejectedRecords = 0
  let activeRecords = 0
  let inactiveRecords = 0
  let recordsWithRegistration = 0
  const registrationIdentifiers = new Set()

  const { hash: sourceSha256, rowCount: recordsRead } = await forEachCsvRow(csvPath, (row) => {
    const canonical = JSON.stringify(row.map(clean))
    const rowHash = createHash('sha256').update(canonical).digest('hex')
    if (seen.has(rowHash)) {
      duplicatesRemoved += 1
      return
    }
    seen.add(rowHash)

    const record = mapRecord(row)
    if (!record) {
      rejectedRecords += 1
      return
    }
    const shardId = record.pack.split('/').pop().replace('.json', '')
    const pack = packs.get(shardId) ?? []
    pack.push(record)
    packs.set(shardId, pack)

    if (record.registrationNumber) {
      recordsWithRegistration += 1
      registrationIdentifiers.add(record.registrationNumber)
    }
    if (record.registrationSituation === 'Ativo') activeRecords += 1
    if (record.registrationSituation === 'Inativo') inactiveRecords += 1
    searchRecords.push({
      id: record.id,
      productName: record.productName,
      activeIngredient: record.activeIngredient,
      registrationNumber: record.registrationNumber,
      holder: record.holder,
      regulatoryCategory: record.regulatoryCategory,
      therapeuticClass: record.therapeuticClass,
      registrationSituation: record.registrationSituation,
      pack: record.pack,
    })
  })

  const retrievedAt = new Date().toISOString().slice(0, 10)
  const sourceRecordCount = searchRecords.length
  const shardSummaries = []
  for (const [shardId, records] of packs) {
    const path = `medicines/packs/${shardId}.json`
    await writeFile(resolve(projectDirectory, 'public/data/medical-library', path), `${JSON.stringify({
      schemaVersion: 1,
      sourceId,
      retrievedAt,
      records,
    })}\n`, 'utf8')
    shardSummaries.push({ id: shardId, path, recordCount: records.length })
  }

  const searchIndexPath = 'medicines/search-index.json'
  await writeFile(resolve(outputDirectory, 'search-index.json'), `${JSON.stringify({
    schemaVersion: 1,
    sourceId,
    retrievedAt,
    recordCount: sourceRecordCount,
    records: searchRecords,
  })}\n`, 'utf8')

  const manifest = {
    schemaVersion: 1,
    sourceId,
    sourceUrl,
    dictionaryUrl,
    retrievedAt,
    sourceFile: 'DADOS_ABERTOS_MEDICAMENTOS.csv',
    sourceFileBytes: csvInfo.size,
    sourceSha256,
    sourceFormat: { encoding: 'Windows-1252', delimiter: ';', quote: '"', fields: header },
    datasetDefinition: 'A documentação da Anvisa descreve esta base como registros válidos sem petição de cancelamento; a situação publicada no campo de cada registro é preservada literalmente.',
    recordsRead,
    recordsImported: sourceRecordCount,
    duplicateRowsRemoved: duplicatesRemoved,
    rejectedRows: rejectedRecords,
    recordsWithRegistrationNumber: recordsWithRegistration,
    uniqueRegistrationNumbers: registrationIdentifiers.size,
    situationCounts: { Ativo: activeRecords, Inativo: inactiveRecords },
    searchIndexPath,
    shards: shardSummaries.sort((left, right) => left.id.localeCompare(right.id)),
  }
  const manifestPath = resolve(scriptDirectory, 'data/anvisa-import-manifest.json')
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  await writeFile(resolve(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  const sourcesPath = resolve(scriptDirectory, 'data/sources.json')
  const sources = JSON.parse(await readFile(sourcesPath, 'utf8'))
  const source = sources.find((record) => record.id === sourceId)
  if (!source) throw new Error(`The source ${sourceId} must be registered before importing medicines.`)
  source.checkedAt = retrievedAt
  await writeFile(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`, 'utf8')
  await writeFile(resolve(projectDirectory, 'docs/ANVISA_IMPORT_REPORT.md'), [
    '# Importação do conjunto aberto de medicamentos da Anvisa',
    '',
    `- Fonte CSV: ${sourceUrl}`,
    `- Dicionário: ${dictionaryUrl}`,
    `- Data de consulta e geração: ${retrievedAt}`,
    `- SHA-256 do CSV: \`${sourceSha256}\``,
    `- Formato: Windows-1252, delimitador ponto e vírgula, aspas duplas; o CSV tem 11 campos e o PDF descreve 10. O campo SITUACAO_REGISTRO não é definido no dicionário e foi preservado literalmente.`,
    `- Linhas lidas: ${recordsRead}`,
    `- Registros importados após deduplicação de linhas normalizadas: ${sourceRecordCount}`,
    `- Linhas duplicadas removidas após normalização de espaços: ${duplicatesRemoved}`,
    `- Linhas rejeitadas: ${rejectedRecords}`,
    `- Registros com número de registro preenchido: ${recordsWithRegistration}`,
    `- Valores brutos de SITUACAO_REGISTRO: ${activeRecords} “Ativo”, ${inactiveRecords} “Inativo”; o significado jurídico/operacional não foi inferido.`,
    `- Arquivo de busca: \`public/data/medical-library/${searchIndexPath}\``,
    `- Pacotes de detalhes: ${shardSummaries.length} arquivos em \`public/data/medical-library/medicines/packs/\`.`,
    '',
    'A documentação define a base como registros sem petição de cancelamento, mas isso não significa que cada registro esteja ativo ou que o produto esteja comercialmente disponível. O campo de situação e a validade bruta são preservados sem interpretação. Indicações, doses, contraindicações e recomendações não fazem parte deste conjunto e não são inferidas.',
    '',
    'A amostra foi comparada com os campos e definições do dicionário oficial. A conferência individual em consultas interativas de produto não é declarada como realizada neste relatório.',
  ].join('\n') + '\n', 'utf8')

  console.log(JSON.stringify({
    input: csvPath,
    fileBytes: csvInfo.size,
    ...manifest,
    generatedPackCount: shardSummaries.length,
    manifestPath,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
