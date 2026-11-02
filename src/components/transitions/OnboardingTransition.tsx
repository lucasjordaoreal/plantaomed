import { useEffect, useState, type CSSProperties } from 'react'

const consumedTransitionKey = 'plantaomed:onboarding-transition'

type OnboardingTransitionProps = {
  id: string
  x: number
  y: number
}

export function OnboardingTransition({ id, x, y }: OnboardingTransitionProps) {
  const [visible, setVisible] = useState(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
    return sessionStorage.getItem(consumedTransitionKey) !== id
  })

  useEffect(() => {
    if (visible) sessionStorage.setItem(consumedTransitionKey, id)
  }, [id, visible])

  if (!visible) return null

  const style = {
    '--onboarding-origin-x': `${x * 100}%`,
    '--onboarding-origin-y': `${y * 100}%`,
  } as CSSProperties

  return (
    <div
      className="onboarding-transition"
      style={style}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setVisible(false)
      }}
    />
  )
}
