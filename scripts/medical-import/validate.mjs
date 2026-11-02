import { readFile } from 'node:fs/promises'
import { validateCatalog } from './lib.mjs'

const dataDirectory = new URL('./data/', import.meta.url)
const readJson = async (name) => JSON.parse(await readFile(new URL(name, dataDirectory), 'utf8'))
const [sources, documents, medicines, legacySubjects, medicineImport] = await Promise.all([
  readJson('sources.json'),
  readJson('documents.json'),
  readJson('medicines.json'),
  readJson('legacy-subjects.json'),
  readJson('anvisa-import-manifest.json').catch((error) => {
    if (error?.code === 'ENOENT') return null
    throw error
  }),
])
const errors = validateCatalog({ sources, documents, medicines, legacySubjects, medicineImport })

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Catalog structure valid: ${documents.length} documents, ${legacySubjects.length} legacy subjects, ${medicines.length + (medicineImport?.recordsImported ?? 0)} medicines, ${sources.length} sources.`)
}
