// The English dictionary. It starts with the core sections every page needs; each screen's
// own sections are added when that screen's code loads (scripts/strings-split.mjs).
import core from 'virtual:dk-strings/core'

export const english = { ...core }

/** Called by virtual:dk-strings/<section> modules when they load */
export function addEnglish(sections) {
  Object.assign(english, sections)
}
