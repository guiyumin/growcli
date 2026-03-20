import Database from 'better-sqlite3';
import { StorageAdapter, Document } from './adapter.js';

export class LocalAdapter implements StorageAdapter {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT NOT NULL,
        collection TEXT NOT NULL,
        data JSON,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (id, collection)
      )
    `);
  }

  save(collection: string, id: string, data: Record<string, unknown>): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO documents (id, collection, data, created_at, updated_at)
      VALUES (?, ?, json(?), ?, ?)
      ON CONFLICT(id, collection) DO UPDATE SET
        data = json(?),
        updated_at = ?
    `).run(id, collection, JSON.stringify(data), now, now, JSON.stringify(data), now);
  }

  find(collection: string, id: string): Document | null {
    const row = this.db.prepare(
      'SELECT * FROM documents WHERE collection = ? AND id = ?'
    ).get(collection, id) as Record<string, string> | undefined;
    if (!row) return null;
    return { ...row, data: JSON.parse(row.data) } as Document;
  }

  findAll(collection: string): Document[] {
    const rows = this.db.prepare(
      'SELECT * FROM documents WHERE collection = ?'
    ).all(collection) as Record<string, string>[];
    return rows.map(row => ({ ...row, data: JSON.parse(row.data) }) as Document);
  }

  delete(collection: string, id: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM documents WHERE collection = ? AND id = ?'
    ).run(collection, id);
    return result.changes > 0;
  }

  close(): void {
    this.db.close();
  }
}
