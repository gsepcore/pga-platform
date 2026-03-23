#!/usr/bin/env node

/**
 * GSEP CLI - Interactive Command Line Interface
 *
 * @author Luis Alfredo Velasquez Duran (Germany, 2025)
 * @license MIT
 */

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { VERSION } from '@gsep/core';

const program = new Command();

// ASCII Art Banner
console.log(
    chalk.cyan(
        figlet.textSync('GSEP CLI', {
            font: 'Standard',
            horizontalLayout: 'default',
        })
    )
);

console.log(
    chalk.gray(
        '  Genomic Self-Evolving Prompts | World-Class AI Agent Platform\n'
    )
);

// CLI Configuration
program
    .name('gsep')
    .description('Interactive CLI for GSEP (Genomic Self-Evolving Prompts)')
    .version(VERSION)
    .option('-v, --verbose', 'Enable verbose output')
    .option('--no-color', 'Disable colored output');

// ─── INIT Command ───────────────────────────────────────────

program
    .command('init')
    .description('Initialize a new GSEP project')
    .option('-t, --template <name>', 'Use a template (basic, advanced, enterprise)', 'basic')
    .option('-d, --dir <path>', 'Project directory', '.')
    .action(async (options) => {
        const { init } = await import('./commands/init.js');
        await init(options);
    });

// ─── DOCTOR Command ─────────────────────────────────────────

program
    .command('doctor')
    .description('Run diagnostics and check for issues')
    .option('--fix', 'Attempt to fix issues automatically')
    .action(async (options) => {
        const { doctor } = await import('./commands/doctor.js');
        await doctor(options);
    });

// ─── Parse and Execute ──────────────────────────────────────

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
