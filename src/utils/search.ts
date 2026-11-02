import type { Protocol } from '../types'

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function searchProtocols(query: string, protocols: Protocol[]): Protocol[] {
  const text = normalize(query)

  if (!text) {
    return protocols
  }

  return [...protocols]
    .map((protocol) => {
      const haystack = normalize(
        [
          protocol.title,
          protocol.category,
          protocol.summary,
          protocol.synonyms.join(' '),
          protocol.population,
        ].join(' '),
      )

      const exact = haystack.includes(text) ? 2 : 0
      const title = normalize(protocol.title).includes(text) ? 3 : 0
      const synonym = protocol.synonyms.some((synonym) => normalize(synonym).includes(text)) ? 2 : 0
      const total = exact + title + synonym

      return { protocol, total }
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((entry) => entry.protocol)
}
