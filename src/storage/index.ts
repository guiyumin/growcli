import { join } from 'path';
import { StorageAdapter } from './adapter.js';
import { LocalAdapter } from './local.js';
import { loadConfig, getGrowDir } from '../config/index.js';

export function createStorage(): StorageAdapter {
  const config = loadConfig();

  switch (config.storage.driver) {
    case 'local':
      return new LocalAdapter(join(getGrowDir(), 'data.db'));
    case 'mysql':
    case 'postgres':
      throw new Error(`"${config.storage.driver}" storage driver is not yet implemented. Use "local" for now.`);
    default:
      throw new Error(`Unknown storage driver: "${(config.storage as any).driver}"`);
  }
}

export type { StorageAdapter, Document } from './adapter.js';
