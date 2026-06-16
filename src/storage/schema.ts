export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  visit_count INTEGER DEFAULT 0,
  device_scoped INTEGER DEFAULT 0,
  source_device_id TEXT,
  deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS bookmark_tags (
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (bookmark_id, tag_id)
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  last_sync TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts USING fts5(
  url, title, notes,
  content='bookmarks',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS bookmarks_ai AFTER INSERT ON bookmarks BEGIN
  INSERT INTO bookmarks_fts(rowid, url, title, notes)
  VALUES (new.rowid, new.url, new.title, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS bookmarks_ad AFTER DELETE ON bookmarks BEGIN
  INSERT INTO bookmarks_fts(bookmarks_fts, rowid, url, title, notes)
  VALUES ('delete', old.rowid, old.url, old.title, old.notes);
END;

CREATE TRIGGER IF NOT EXISTS bookmarks_au AFTER UPDATE ON bookmarks BEGIN
  INSERT INTO bookmarks_fts(bookmarks_fts, rowid, url, title, notes)
  VALUES ('delete', old.rowid, old.url, old.title, old.notes);
  INSERT INTO bookmarks_fts(rowid, url, title, notes)
  VALUES (new.rowid, new.url, new.title, new.notes);
END;
`
