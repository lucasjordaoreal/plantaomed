const STORAGE_PREFIX = 'plantaomed:'

export const STORAGE_KEYS = {
  favorites: `${STORAGE_PREFIX}favorites`,
  history: `${STORAGE_PREFIX}history`,
  theme: `${STORAGE_PREFIX}theme`,
  onboardingCompleted: 'plantaomed.onboarding.completed',
  onboardingCompletedLegacy: `${STORAGE_PREFIX}onboarding:completed`,
} as const

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getOnboardingCompleted(): boolean {
  for (const key of [STORAGE_KEYS.onboardingCompleted, STORAGE_KEYS.onboardingCompletedLegacy]) {
    try {
      const value = localStorage.getItem(key)
      if (value === null) continue
      return value === 'true'
    } catch {
      return false
    }
  }
  return false
}

export function setOnboardingCompleted(value: boolean): void {
  const payload = String(value)
  for (const key of [STORAGE_KEYS.onboardingCompleted, STORAGE_KEYS.onboardingCompletedLegacy]) {
    try {
      localStorage.setItem(key, payload)
    } catch {
      // localStorage may be unavailable; ignore the preference gracefully.
    }
  }
}

export function toggleFavorite(id: string, favorites: string[]): string[] {
  return favorites.includes(id)
    ? favorites.filter((item) => item !== id)
    : [id, ...favorites].slice(0, 40)
}

export function appendHistory(id: string, history: string[]): string[] {
  const next = history.filter((item) => item !== id)
  return [id, ...next].slice(0, 12)
}
