// Module state lives for the whole tab session and resets on a hard load, so it
// tells print pages whether browser history holds an app page Next can restore.
let appShellVisited = false

export function markAppShellVisited() {
  appShellVisited = true
}

export function hasAppShellHistory() {
  return appShellVisited
}
