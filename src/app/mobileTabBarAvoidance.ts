export type LayoutRect = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>

export function calculateMobileTabBarOffset(
  tabBar: LayoutRect,
  overlays: LayoutRect[],
  clearance = 8,
): number {
  if (tabBar.width <= 0 || tabBar.height <= 0) return 0

  return overlays.reduce((offset, overlay) => {
    const intersectsHorizontally = tabBar.left < overlay.right && tabBar.right > overlay.left
    const intersectsVertically = tabBar.top < overlay.bottom && tabBar.bottom > overlay.top

    if (!intersectsHorizontally || !intersectsVertically) return offset
    return Math.max(offset, tabBar.bottom - overlay.top + clearance)
  }, 0)
}
