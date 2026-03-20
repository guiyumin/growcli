export interface Document {
  id: string;
  collection: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StorageAdapter {
  save(collection: string, id: string, data: Record<string, unknown>): void;
  find(collection: string, id: string): Document | null;
  findAll(collection: string): Document[];
  delete(collection: string, id: string): boolean;
  close(): void;
}
