import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { buildCatalog, validateCatalog } from './lib.mjs'

const dataDirectory = new URL('./data/', import.meta.url)
const readJson = async (name) => JSON.parse(await readFile(new URL(name, dataDirectory), 'utf8'))

describe('medical library catalog', () => {
  it('validates the source records and static catalog data', async () => {
    const [sources, documents, medicines, legacySubjects] = await Promise.all([
      readJson('sources.json'),
      readJson('documents.json'),
      readJson('medicines.json'),
      readJson('legacy-subjects.json'),
    ])

    expect(validateCatalog({ sources, documents, medicines, legacySubjects })).toEqual([])

    const { index, outputFiles } = buildCatalog({
      sources,
      documents,
      medicines,
      legacySubjects,
      catalogDate: '2026-11-02',
    })
    expect(index.counts.documentsCataloged).toBe(documents.length)
    expect(index.counts.legacySubjectsWithoutVerifiedDocumentLink).toBe(legacySubjects.length)
    expect(index.searchEntries).toHaveLength(documents.length)
    expect(index.counts.completeClinicallyReviewedProtocols).toBe(0)
    expect(index.counts.medicinesWithConfirmedAnvisaRegistration).toBe(0)
    expect(outputFiles.has('catalog-index.json')).toBe(true)
    expect(outputFiles.has('sources.json')).toBe(true)
    expect(outputFiles.has('medicines.json')).toBe(true)
  })

  it('reports malformed document URLs without throwing during validation', () => {
    expect(() => validateCatalog({
      sources: [],
      documents: [{
        id: 'invalid-document',
        title: 'Documento',
        specialty: 'Especialidade',
        type: 'PCDT',
        publicationDate: '2025-01-01',
        updatedAt: null,
        officialUrl: 'not-a-url',
        sourceId: 'missing-source',
      }],
      medicines: [],
      legacySubjects: [],
    })).not.toThrow()
  })
})
