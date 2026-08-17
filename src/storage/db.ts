import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { SCHEMA_SQL } from './schema'

let db: Database.Database | null = null

export function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'bookmarks.db')
}

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(SCHEMA_SQL)

  migrate(db)

  return db
}

function migrate(db: Database.Database): void {
  const cols = (db.prepare('PRAGMA table_info(bookmarks)').all() as { name: string }[]).map((c) => c.name)
  if (!cols.includes('summary')) {
    db.exec(`ALTER TABLE bookmarks ADD COLUMN summary TEXT DEFAULT ''`)
  }
  if (!cols.includes('thumbnail_path')) {
    db.exec(`ALTER TABLE bookmarks ADD COLUMN thumbnail_path TEXT DEFAULT ''`)
  }
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
