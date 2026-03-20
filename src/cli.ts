#!/usr/bin/env node
import { Command } from 'commander';
import { brandCommand } from './commands/brand.js';

const program = new Command();

program
  .name('grow')
  .description('AI-powered marketing agent for the terminal')
  .version('0.1.0');

program.addCommand(brandCommand);

program.parse();
