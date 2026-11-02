const datePattern = /^\d{4}-\d{2}-\d{2}$/

function isCalendarDate(value) {
  if (!datePattern.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function validateCatalog({ sources, documents, medicines, legacySubjects, medicineImport = null }) {
  const errors = []
  const sourcesById = new Map()
  const documentsById = new Map()
  const subjectsById = new Set(legacySubjects.map((subject) => subject.id))

  for (const [index, source] of sources.entries()) {
    const label = source.id || `source-${index + 1}`
    if (!source.id || sourcesById.has(source.id)) errors.push(`${label}: missing or duplicate source ID.`)
    if (!source.title?.trim() || !source.organization?.trim()) errors.push(`${label}: title or organization missing.`)
    if (!isHttpsUrl(source.url)) errors.push(`${label}: source URL must use HTTPS.`)
    if (!isCalendarDate(source.checkedAt)) errors.push(`${label}: invalid source check date.`)
    sourcesById.set(source.id, source)
  }

  for (const [index, document] of documents.entries()) {
    const label = document.id || `document-${index + 1}`
    if (!document.id || documentsById.has(document.id)) errors.push(`${label}: missing or duplicate document ID.`)
    if (!document.title?.trim() || !document.specialty?.trim() || !document.type?.trim()) {
      errors.push(`${label}: title, specialty, or type missing.`)
    }
    if (document.publicationDate !== null && !isCalendarDate(document.publicationDate)) errors.push(`${label}: invalid publication date.`)
    if (document.updatedAt !== null && !isCalendarDate(document.updatedAt)) errors.push(`${label}: invalid update date.`)
    if (!isHttpsUrl(document.officialUrl)) {
      errors.push(`${label}: official document URL must use HTTPS.`)
    } else if (new URL(document.officialUrl).hostname !== 'www.gov.br') {
      errors.push(`${label}: document URL is outside the verified government domain.`)
    }
    if (!sourcesById.has(document.sourceId)) errors.push(`${label}: source ${document.sourceId} is not registered.`)
    documentsById.set(document.id, document)

    const subjectId = document.id.replace(/^pcdt-/, '')
    subjectsById.add(subjectId)
  }

  for (const [index, medicine] of medicines.entries()) {
    const label = medicine.id || `medicine-${index + 1}`
    if (!medicine.id || !medicine.name?.trim()) errors.push(`${label}: medicine ID or name missing.`)
    if (medicine.verificationStatus === 'confirmed' && (!medicine.sourceId || !sourcesById.has(medicine.sourceId))) {
      errors.push(`${label}: confirmed medicine requires a registered official source.`)
    }
  }

  for (const [index, subject] of legacySubjects.entries()) {
    const label = subject.id || `legacy-subject-${index + 1}`
    if (!subject.id || !subject.title?.trim() || !subject.specialty?.trim()) {
      errors.push(`${label}: legacy subject metadata incomplete.`)
    }
  }

  if (medicineImport) {
    if (!sourcesById.has(medicineImport.sourceId)) errors.push(`Medicine import source ${medicineImport.sourceId} is not registered.`)
    const importCounts = [
      medicineImport.recordsRead,
      medicineImport.recordsImported,
      medicineImport.duplicateRowsRemoved,
      medicineImport.rejectedRows,
      medicineImport.recordsWithRegistrationNumber,
      medicineImport.uniqueRegistrationNumbers,
    ]
    if (importCounts.some((count) => !Number.isInteger(count) || count < 0)) {
      errors.push('Medicine import record counts must be non-negative integers.')
    } else {
      if (medicineImport.recordsRead !== medicineImport.recordsImported + medicineImport.duplicateRowsRemoved + medicineImport.rejectedRows) {
        errors.push('Medicine import read, imported, duplicate, and rejected counts do not reconcile.')
      }
      if (medicineImport.recordsWithRegistrationNumber > medicineImport.recordsImported) {
        errors.push('Medicine records with registration numbers exceed imported records.')
      }
      if (medicineImport.uniqueRegistrationNumbers > medicineImport.recordsWithRegistrationNumber) {
        errors.push('Unique medicine registration numbers exceed records with registration numbers.')
      }
    }
    if (!isCalendarDate(medicineImport.retrievedAt)) errors.push('Medicine import retrieval date is invalid.')
    if (medicineImport.searchIndexPath !== 'medicines/search-index.json') errors.push('Medicine search index path is invalid.')
  }

  return errors
}

export function buildCatalog({ sources, documents, medicines, legacySubjects, medicineImport = null, catalogDate }) {
  const packs = new Map()
  const subjects = new Map()

  for (const document of documents) {
    const specialtyKey = slugify(document.specialty)
    const packDocuments = packs.get(specialtyKey) ?? []
    packDocuments.push({
      ...document,
      catalogStatus: 'listed_in_official_catalog',
      validityStatus: 'not_individually_verified',
      reuseStatus: 'metadata_and_link_only',
      catalogedAt: catalogDate,
    })
    packs.set(specialtyKey, packDocuments)

    const subjectId = document.id.replace(/^pcdt-/, '')
    const subject = subjects.get(subjectId) ?? {
      id: subjectId,
      title: document.title,
      specialty: document.specialty,
      documentIds: [],
      recordType: 'bibliographic_subject',
    }
    subject.documentIds.push(document.id)
    subjects.set(subjectId, subject)
  }

  const specialtySummaries = [...packs.entries()]
    .map(([key, packDocuments]) => ({
      id: key,
      name: packDocuments[0].specialty,
      documentCount: packDocuments.length,
      subjectCount: new Set(packDocuments.map((document) => document.id.replace(/^pcdt-/, ''))).size,
      documentPack: `documents/${key}.json`,
      subjectPack: `subjects/${key}.json`,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))

  const searchEntries = [...packs.entries()].flatMap(([key, packDocuments]) =>
    packDocuments.map((document) => ({
      id: document.id,
      title: document.title,
      specialty: document.specialty,
      type: document.type,
      publicationYear: document.publicationDate?.slice(0, 4) ?? null,
      organization: document.organization,
      version: document.version,
      officialUrl: document.officialUrl,
      pack: `documents/${key}.json`,
    })),
  ).sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))

  const index = {
    schemaVersion: 1,
    catalogDate,
    counts: {
      identifiedLegacySubjects: legacySubjects.length,
      subjectsWithOfficialDocuments: subjects.size,
      legacySubjectsWithoutVerifiedDocumentLink: legacySubjects.length,
      documentsCataloged: documents.length,
      documentsWithTextReusePermission: 0,
      documentsWithIndividualCurrentValidityCheck: 0,
      completeClinicallyReviewedProtocols: 0,
      medicinesWithConfirmedAnvisaRegistration: medicines.filter((medicine) => medicine.verificationStatus === 'confirmed').length
        + (medicineImport?.individuallyVerifiedRegistrationCount ?? 0),
      medicinesCataloged: medicines.length + (medicineImport?.recordsImported ?? 0),
      medicinesWithRegistrationNumber: medicineImport?.recordsWithRegistrationNumber ?? 0,
      medicinesUniqueRegistrationNumbers: medicineImport?.uniqueRegistrationNumbers ?? 0,
      recordsPendingVerification: documents.length + medicines.filter((medicine) => medicine.verificationStatus !== 'confirmed').length
        + (medicineImport?.recordsImported ?? 0),
    },
    specialties: specialtySummaries,
    sourcesPath: 'sources.json',
    medicinesPath: 'medicines/manifest.json',
    medicineSearchIndexPath: medicineImport?.searchIndexPath ?? 'medicines/search-index.json',
    searchEntries,
  }

  const outputFiles = new Map([
    ['catalog-index.json', index],
    ['sources.json', sources],
    ['medicines.json', medicines],
  ])
  if (medicineImport) outputFiles.set('medicines/manifest.json', medicineImport)

  for (const [key, packDocuments] of packs) {
    const specialtySubjects = [...new Set(
      packDocuments.map((document) => document.id.replace(/^pcdt-/, '')),
    )].map((subjectId) => subjects.get(subjectId))
    outputFiles.set(`documents/${key}.json`, {
      schemaVersion: 1,
      specialty: packDocuments[0].specialty,
      documents: packDocuments,
    })
    outputFiles.set(`subjects/${key}.json`, {
      schemaVersion: 1,
      specialty: packDocuments[0].specialty,
      subjects: specialtySubjects,
    })
  }

  const coverageRows = [
    ['Assuntos ligados a documentos oficiais catalogados', index.counts.subjectsWithOfficialDocuments],
    ['Registros legados sem vínculo documental verificado', index.counts.legacySubjectsWithoutVerifiedDocumentLink],
    ['Documentos oficiais catalogados com metadados', index.counts.documentsCataloged],
    ['Documentos com permissão de reprodução confirmada', index.counts.documentsWithTextReusePermission],
    ['Documentos com vigência individualmente verificada', index.counts.documentsWithIndividualCurrentValidityCheck],
    ['Protocolos completos com revisão clínica', index.counts.completeClinicallyReviewedProtocols],
    ['Medicamentos com registro Anvisa individualmente confirmado', index.counts.medicinesWithConfirmedAnvisaRegistration],
    ['Medicamentos catalogados', index.counts.medicinesCataloged],
    ['Medicamentos com número de registro preenchido na base', index.counts.medicinesWithRegistrationNumber],
    ['Números de registro distintos na base', index.counts.medicinesUniqueRegistrationNumbers],
    ['Registros pendentes de verificação individual', index.counts.recordsPendingVerification],
  ]
  const specialtyRows = specialtySummaries
    .map((specialty) => `| ${specialty.name} | ${specialty.subjectCount} | ${specialty.documentCount} |`)
    .join('\n')
  const coverageReport = `# Cobertura do catálogo médico brasileiro

Relatório gerado a partir dos dados de importação estáticos em ${catalogDate}. Os totais descrevem apenas registros presentes no projeto; não representam cobertura da medicina brasileira.

## Contagens verificáveis

| Métrica | Total |
|---|---:|
${coverageRows.map(([name, count]) => `| ${name} | ${count} |`).join('\n')}

Os assuntos ligados a documentos representam registros bibliográficos derivados do catálogo de PCDTs do Ministério da Saúde/Conitec. Os seis temas legados permanecem separados e não foram considerados documentos oficiais nem conteúdo clínico validado. Seus vínculos individuais com os documentos catalogados ainda não foram verificados; portanto, o relatório não afirma ausência de documentos oficiais correspondentes.

## Documentos por especialidade

| Especialidade atribuída para navegação | Assuntos ligados | Documentos |
|---|---:|---:|
${specialtyRows}

As especialidades são uma organização de navegação do projeto, não uma classificação clínica oficial.

## Instituições e fontes consultadas

O catálogo oficial de PCDTs do Ministério da Saúde/Conitec foi consultado para os metadados bibliográficos e links. Também foram consultados portais do Ministério da Saúde, Anvisa, Dados Abertos do SUS, Sociedade Brasileira de Cardiologia, Sociedade Brasileira de Pediatria, Sociedade Brasileira de Pneumologia e Tisiologia e Sociedade Brasileira de Diabetes. Algumas páginas foram acessíveis, mas não expuseram listagens estruturadas; isso está indicado em \`sources.json\`.

## Limites e próximos passos

- ${index.counts.documentsCataloged} registros têm título, especialidade, data listada e link oficial extraídos do catálogo; os documentos individuais não foram reabertos um a um para verificar vigência, integridade ou anexos.
- Nenhum texto de PCDT foi copiado. A permissão de reprodução de conteúdo integral ou resumido não foi verificada.
- Não há conteúdo clínico completo aprovado nesta entrega. Os seis registros legados não contam como protocolos verificados.
- Nenhuma DCB, apresentação, bula, registro Anvisa ou inclusão na Rename foi conferida individualmente; não há medicamento verificado no catálogo.
- A próxima etapa é conferir cada documento individualmente, validar o vínculo assunto-documento, avaliar licenças e submeter qualquer resumo clínico a revisão profissional documentada.
`

  return { index, outputFiles, coverageReport }
}
