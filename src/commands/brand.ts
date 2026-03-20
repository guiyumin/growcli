import { Command } from 'commander';
import { createStorage } from '../storage/index.js';

export const brandCommand = new Command('brand')
  .description('Manage brand context');

brandCommand
  .command('set')
  .description('Set a brand property')
  .argument('<key>', 'Property name (e.g., name, voice, guidelines)')
  .argument('<value>', 'Property value')
  .action((key: string, value: string) => {
    const storage = createStorage();
    const existing = storage.find('brand', 'default');
    const data = existing?.data ?? {};
    data[key] = value;
    storage.save('brand', 'default', data);
    storage.close();
    console.log(`Brand ${key} set to: ${value}`);
  });

brandCommand
  .command('show')
  .description('Show brand context')
  .action(() => {
    const storage = createStorage();
    const brand = storage.find('brand', 'default');
    storage.close();

    if (!brand) {
      console.log('No brand context set. Use "grow brand set <key> <value>" to get started.');
      return;
    }

    console.log('\nBrand Context:');
    for (const [key, value] of Object.entries(brand.data)) {
      console.log(`  ${key}: ${value}`);
    }
    console.log();
  });
