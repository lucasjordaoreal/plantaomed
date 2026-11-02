import { describe, expect, it } from 'vitest'
import { clinicalKnowledgeSources } from './knowledgeSources'

describe('clinical assistant source registry', () => {
  it('records the inspected Brazilian guideline as source-audited, not clinically reviewed', () => {
    expect(clinicalKnowledgeSources).toHaveLength(1)
    expect(clinicalKnowledgeSources[0]).toMatchObject({
      id: 'pcdt-avci-2023',
      organization: 'Ministério da Saúde / Conitec',
      verificationStatus: 'source_verified',
      clinicalReviewStatus: 'not_reviewed',
      publishedAt: '2023-12-15',
      accessedAt: '2026-11-02',
    })
    expect(clinicalKnowledgeSources[0].url).toMatch(/^https:\/\/www\.gov\.br\//)
  })
})
