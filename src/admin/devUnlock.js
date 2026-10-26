// The developer options are hidden: tapping the version text at the bottom of More 7 times shows
// them on this device only (remembered in this browser). It only shows the buttons: the server
// still checks the account (adminCore.mjs devAllowed) for every developer action.
const KEY = 'dk_dev_unlocked'
export const TAPS_TO_UNLOCK = 7

export function devUnlocked() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setDevUnlocked(on) {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode: unlocked for this visit only */
  }
}
