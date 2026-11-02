import type { MedicineImportManifest, MedicineRecordPack, MedicineSearchIndex } from '../types'

let manifestRequest: Promise<MedicineImportManifest> | null = null
let searchIndexRequest: Promise<MedicineSearchIndex> | null = null
const recordPackRequests = new Map<string, Promise<MedicineRecordPack>>()

function medicineUrl(path: string): URL {
  return new URL(`${import.meta.env.BASE_URL}data/medical-library/${path}`, window.location.origin)
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(medicineUrl(path))
  if (!response.ok) throw new Error(`Não foi possível carregar ${path} (HTTP ${response.status}).`)
  return response.json() as Promise<T>
}

export function getMedicineManifest(): Promise<MedicineImportManifest> {
  if (!manifestRequest) {
    manifestRequest = fetchJson<MedicineImportManifest>('medicines/manifest.json').catch((error: unknown) => {
      manifestRequest = null
      throw error
    })
  }
  return manifestRequest
}

export function getMedicineSearchIndex(path: string): Promise<MedicineSearchIndex> {
  if (!searchIndexRequest) {
    searchIndexRequest = fetchJson<MedicineSearchIndex>(path).catch((error: unknown) => {
      searchIndexRequest = null
      throw error
    })
  }
  return searchIndexRequest
}

export function getMedicineRecordPack(path: string): Promise<MedicineRecordPack> {
  let request = recordPackRequests.get(path)
  if (!request) {
    request = fetchJson<MedicineRecordPack>(path).catch((error: unknown) => {
      recordPackRequests.delete(path)
      throw error
    })
    recordPackRequests.set(path, request)
  }
  return request
}
