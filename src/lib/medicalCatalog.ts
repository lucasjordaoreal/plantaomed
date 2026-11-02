import type { OfficialCatalogIndex } from '../types'

let indexRequest: Promise<OfficialCatalogIndex> | null = null

export function getMedicalCatalogIndex(): Promise<OfficialCatalogIndex> {
  if (!indexRequest) {
    const url = new URL(`${import.meta.env.BASE_URL}data/medical-library/catalog-index.json`, window.location.origin)
    indexRequest = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`Não foi possível carregar o índice de documentos (HTTP ${response.status}).`)
      return response.json() as Promise<OfficialCatalogIndex>
    }).catch((error: unknown) => {
      indexRequest = null
      throw error
    })
  }
  return indexRequest
}
