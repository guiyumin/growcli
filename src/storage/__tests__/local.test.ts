import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalAdapter } from '../local.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_DB = join(tmpdir(), 'grow-test.db');

describe('LocalAdapter', () => {
  let adapter: LocalAdapter;

  beforeEach(() => {
    adapter = new LocalAdapter(TEST_DB);
  });

  afterEach(() => {
    adapter.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    if (existsSync(TEST_DB + '-wal')) unlinkSync(TEST_DB + '-wal');
    if (existsSync(TEST_DB + '-shm')) unlinkSync(TEST_DB + '-shm');
  });

  it('should save and find a document', () => {
    adapter.save('brand', 'default', { name: 'Acme' });
    const doc = adapter.find('brand', 'default');
    expect(doc).not.toBeNull();
    expect(doc!.data.name).toBe('Acme');
  });

  it('should update existing document', () => {
    adapter.save('brand', 'default', { name: 'Acme' });
    adapter.save('brand', 'default', { name: 'Acme Corp' });
    const doc = adapter.find('brand', 'default');
    expect(doc!.data.name).toBe('Acme Corp');
  });

  it('should return null for missing document', () => {
    const doc = adapter.find('brand', 'nonexistent');
    expect(doc).toBeNull();
  });

  it('should find all documents in a collection', () => {
    adapter.save('audit', '1', { type: 'seo', url: 'example.com' });
    adapter.save('audit', '2', { type: 'social', url: 'twitter.com' });
    const docs = adapter.findAll('audit');
    expect(docs).toHaveLength(2);
  });

  it('should delete a document', () => {
    adapter.save('brand', 'default', { name: 'Acme' });
    const deleted = adapter.delete('brand', 'default');
    expect(deleted).toBe(true);
    expect(adapter.find('brand', 'default')).toBeNull();
  });

  it('should return false when deleting nonexistent', () => {
    const deleted = adapter.delete('brand', 'nonexistent');
    expect(deleted).toBe(false);
  });
});
