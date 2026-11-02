import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCatalog, validateCatalog } from './lib.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const readJson = async (name) => JSON.parse(await readFile(resolve(scriptDirectory, 'data', name), 'utf8'))
const [sources, documents, medicines, legacySubjects] = await Promise.all([
  readJson('sources.json'),
  readJson('documents.json'),
  readJson('medicines.json'),
  readJson('legacy-subjects.json'),
])
const errors = validateCatalog({ sources, documents, medicines, legacySubjects })

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  const { index, outputFiles, coverageReport } = buildCatalog({
    sources,
    documents,
    medicines,
    legacySubjects,
    catalogDate: '2026-11-02',
  })
  const outputDirectory = resolve(scriptDirectory, '../../public/data/medical-library')

  for (const [relativePath, data] of outputFiles) {
    const outputPath = resolve(outputDirectory, relativePath)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  }

  await writeFile(resolve(scriptDirectory, '../../docs/CONTENT_COVERAGE.md'), coverageReport, 'utf8')
  console.log(`Generated ${outputFiles.size} static catalog files for ${index.counts.documentsCataloged} documents across ${index.specialties.length} specialties.`)
}
