export const PUBLIC_SITE_URL = 'https://plantaomeds.netlify.app'
export const PUBLIC_SHARE_IMAGE_PATH = '/social/plantao-med-og.jpg'

export function getPublicUrl(pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return new URL(path, PUBLIC_SITE_URL).toString()
}
