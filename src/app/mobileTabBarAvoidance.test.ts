import { describe, expect, it } from 'vitest'
import { calculateMobileTabBarOffset, type LayoutRect } from './mobileTabBarAvoidance'

const tabBar: LayoutRect = { left: 12, right: 378, top: 770, bottom: 834, width: 366, height: 64 }

describe('calculateMobileTabBarOffset', () => {
  it('does not move the tab bar when no overlay intersects it', () => {
    expect(calculateMobileTabBarOffset(tabBar, [])).toBe(0)
    expect(calculateMobileTabBarOffset(tabBar, [
      { left: 199, right: 390, top: 834, bottom: 898, width: 191, height: 64 },
      { left: 378, right: 569, top: 780, bottom: 844, width: 191, height: 64 },
    ])).toBe(0)
  })

  it('raises the full-width tab bar just enough to clear the overlapping Netlify frame', () => {
    expect(calculateMobileTabBarOffset(tabBar, [
      { left: 199, right: 390, top: 780, bottom: 844, width: 191, height: 64 },
    ])).toBe(62)
  })

  it('uses the greatest required clearance when multiple overlays intersect', () => {
    expect(calculateMobileTabBarOffset(tabBar, [
      { left: 199, right: 390, top: 780, bottom: 844, width: 191, height: 64 },
      { left: 12, right: 100, top: 760, bottom: 800, width: 88, height: 40 },
    ])).toBe(82)
  })
})
