import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCatalog, validateCatalog } from './lib.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const readJson = async (name) => JSON.parse(await readFile(resolve(scriptDirectory, 'data', name), 'utf8'))
const readOptionalJson = async (name) => {
  try {
    return await readJson(name)
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}
const [sources, documents, medicines, legacySubjects, medicineImport] = await Promise.all([
  readJson('sources.json'),
  readJson('documents.json'),
  readJson('medicines.json'),
  readJson('legacy-subjects.json'),
  readOptionalJson('anvisa-import-manifest.json'),
])
const errors = validateCatalog({ sources, documents, medicines, legacySubjects, medicineImport })

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  const { index, outputFiles, coverageReport } = buildCatalog({
    sources,
    documents,
    medicines,
    legacySubjects,
    medicineImport,
    catalogDate: new Date().toISOString().slice(0, 10),
  })
  const outputDirectory = resolve(scriptDirectory, '../../public/data/medical-library')

  for (const [relativePath, data] of outputFiles) {
    const outputPath = resolve(outputDirectory, relativePath)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  }

  await writeFile(resolve(scriptDirectory, '../../docs/CONTENT_COVERAGE.md'), coverageReport, 'utf8')
  console.log(`Generated ${outputFiles.size} static catalog files for ${index.counts.documentsCataloged} documents and ${index.counts.medicinesCataloged} medicines across ${index.specialties.length} specialties.`)
}
