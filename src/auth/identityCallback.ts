import type { IdentityCallbackType } from './identityAuthContextValue'

export function identityCallbackTypeFromHash(hash: string): IdentityCallbackType | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (params.has('access_token')) return 'oauth'
  if (params.has('confirmation_token')) return 'confirmation'
  if (params.has('recovery_token')) return 'recovery'
  if (params.has('invite_token')) return 'invite'
  if (params.has('email_change_token')) return 'email_change'
  if (params.has('error') || params.has('error_description')) return 'oauth'
  return null
}

export function isIdentityCallbackHash(hash: string) {
  return identityCallbackTypeFromHash(hash) !== null
}
