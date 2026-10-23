// Wraps a better-sqlite3 Database instance to provide the exact Cloudflare D1 Database API.
// Allows unit testing and local development with the real SQLite queries without needing Miniflare.

export function createD1SqliteAdapter(sqliteDb) {
  function prepare(sql) {
    let boundParams = []

    return {
      bind(...params) {
        boundParams = params
        return this
      },
      async first(colName = null) {
        const stmt = sqliteDb.prepare(sql)
        const row = stmt.get(...boundParams)
        if (!row) return null
        if (colName) return row[colName]
        return row
      },
      async all() {
        const stmt = sqliteDb.prepare(sql)
        const rows = stmt.all(...boundParams)
        return {
          results: rows,
          success: true,
          meta: { changes: 0, last_row_id: 0, duration: 0 },
        }
      },
      async run() {
        const stmt = sqliteDb.prepare(sql)
        const info = stmt.run(...boundParams)
        return {
          success: true,
          meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid), duration: 0 },
        }
      },
      async raw() {
        const stmt = sqliteDb.prepare(sql)
        return stmt.raw().all(...boundParams)
      },
      _execSync() {
        const stmt = sqliteDb.prepare(sql)
        return stmt.run(...boundParams)
      },
    }
  }

  async function batch(statements) {
    const results = []
    const tx = sqliteDb.transaction(() => {
      for (const stmt of statements) {
        results.push(stmt._execSync())
      }
    })
    tx()
    return results.map((info) => ({
      success: true,
      meta: { changes: info?.changes || 0, last_row_id: Number(info?.lastInsertRowid || 0), duration: 0 },
    }))
  }

  async function exec(sqlScript) {
    sqliteDb.exec(sqlScript)
    return { count: 0, duration: 0 }
  }

  return {
    prepare,
    batch,
    exec,
  }
}
