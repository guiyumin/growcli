import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface StorageConfig {
  driver: 'local' | 'mysql' | 'postgres';
  url?: string;
}

export interface GrowConfig {
  storage: StorageConfig;
  providers?: Record<string, unknown>;
  tasks?: Record<string, string>;
}

const GROW_DIR = join(homedir(), '.grow');
const CONFIG_PATH = join(GROW_DIR, 'config.json');

const DEFAULT_CONFIG: GrowConfig = {
  storage: {
    driver: 'local',
  },
};

export function getGrowDir(): string {
  if (!existsSync(GROW_DIR)) {
    mkdirSync(GROW_DIR, { recursive: true });
  }
  return GROW_DIR;
}

export function loadConfig(): GrowConfig {
  getGrowDir();
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
}
