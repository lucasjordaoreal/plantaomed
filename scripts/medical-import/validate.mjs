import { readFile } from 'node:fs/promises'
import { validateCatalog } from './lib.mjs'

const dataDirectory = new URL('./data/', import.meta.url)
const readJson = async (name) => JSON.parse(await readFile(new URL(name, dataDirectory), 'utf8'))
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
  console.log(`Catalog structure valid: ${documents.length} documents, ${legacySubjects.length} legacy subjects, ${medicines.length} medicines, ${sources.length} sources.`)
}
