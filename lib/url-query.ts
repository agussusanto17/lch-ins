// Browser back restores the cached page with its original server props, so
// tabs and filters live in the URL, where the restored page can read them back.
export function replaceQuery(updates: Record<string, string | null>) {
  const params = new URLSearchParams(window.location.search)
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) params.delete(key)
    else params.set(key, value)
  }
  const query = params.toString()
  if (query === window.location.search.slice(1)) return
  const path = window.location.pathname
  window.history.replaceState(null, "", query ? `${path}?${query}` : path)
}
