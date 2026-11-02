import { describe, expect, it } from 'vitest'
import { categories } from '../data/categories'
import { protocols } from '../data/protocols'
import {
  getProtocolSectionsForDisplay,
  getProtocolSummaryForDisplay,
  isProtocolApproved,
  validateProtocolLibrary,
} from './protocolValidation'
import { searchProtocols } from './search'

describe('protocol library validation', () => {
  it('accepts the structure of the existing editorial records', () => {
    expect(validateProtocolLibrary(protocols)).toEqual([])
  })

  it('does not expose any current record as clinically approved', () => {
    expect(protocols.every((protocol) => !isProtocolApproved(protocol))).toBe(true)
  })

  it('keeps every current protocol searchable and available under its category', () => {
    expect(searchProtocols('', protocols)).toHaveLength(6)

    for (const category of categories) {
      const categorizedProtocols = protocols.filter((protocol) => protocol.category === category.name)
      expect(categorizedProtocols.length).toBeGreaterThan(0)
      expect(searchProtocols(category.name, protocols).map((protocol) => protocol.id))
        .toEqual(categorizedProtocols.map((protocol) => protocol.id))
    }

    for (const protocol of protocols) {
      expect(searchProtocols(protocol.title, protocols)).toContainEqual(protocol)
    }
  })

  it('displays draft reference sections without exposing unverified treatment instructions', () => {
    for (const protocol of protocols) {
      const visibleKeys = getProtocolSectionsForDisplay(protocol).map((section) => section.key)
      expect(getProtocolSummaryForDisplay(protocol)).toBeNull()
      expect(visibleKeys).toContain('alerts')
      expect(visibleKeys).toContain('exams')
      expect(visibleKeys).not.toContain('conduct')
      expect(visibleKeys).not.toContain('treatment')
      expect(visibleKeys).not.toContain('contraindications')
    }
  })

  it('rejects approval without a documented source and professional review', () => {
    const protocol = { ...protocols[0], approvalStatus: 'Aprovado' as const }

    expect(isProtocolApproved(protocol)).toBe(false)
    expect(validateProtocolLibrary([protocol])).toContain(
      `${protocol.id}: aprovação requer referência verificável e revisor/data documentados.`,
    )
  })
})
