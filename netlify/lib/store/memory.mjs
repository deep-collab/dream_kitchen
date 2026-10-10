// The practice database for local development and tests (DK_MOCK_BACKEND=1): memoryCore.mjs plus,
// with a data directory (DK_DEV_DATA_DIR, e.g. .dev-data), saving between dev-server restarts and
// keeping uploads as files. Without one it lives in memory (tests). Never used in production.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createMemoryCore, DbError } from './memoryCore.mjs'

export { DbError }

export function createMemoryStore({ dir = '', now, admin = {}, admins } = {}) {
  const file = dir ? join(dir, 'db.json') : ''
  let initial = null
  if (file && existsSync(file)) {
    try {
      initial = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      initial = null
    }
  }
  return createMemoryCore({
    initial,
    now,
    admin,
    admins,
    persist: (db) => {
      if (!file) return
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify(db, null, 1))
    },
    writeFile: dir
      ? (rel, bytes) => {
          const target = join(dir, rel)
          mkdirSync(dirname(target), { recursive: true })
          writeFileSync(target, Buffer.from(bytes))
          return target
        }
      : null,
    readFile: (path) => readFileSync(path),
  })
}
