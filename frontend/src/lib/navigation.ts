type NavigateFn = (href: string, replace?: boolean) => void

let navigateFn: NavigateFn | null = null

export function registerAppNavigation(fn: NavigateFn): void {
  navigateFn = fn
}

export function appNavigate(href: string, replace = false): void {
  if (navigateFn) {
    navigateFn(href, replace)
    return
  }
  if (typeof window === 'undefined') return
  if (replace) {
    window.location.replace(href)
    return
  }
  window.location.href = href
}

export function appReplace(href: string): void {
  appNavigate(href, true)
}
