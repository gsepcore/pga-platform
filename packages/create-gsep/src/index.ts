#!/usr/bin/env node

/**
 * create-gsep — Interactive GSEP Platform Installer
 *
 * One command to create a complete GSEP agent project:
 * npm create gsep@latest my-agent
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import boxen from 'boxen';
import { promptUser } from './prompts.js';
import { installDependencies } from './installer.js';
import { generateProject } from './generator.js';
import { detectRuntime, formatDetectionResult } from './detector.js';

const program = new Command();

// Display welcome banner
function displayBanner() {
    console.log('\n');
    console.log(
        chalk.cyan(
            figlet.textSync('GSEP Platform', {
                font: 'Standard',
                horizontalLayout: 'default',
            })
        )
    );

    console.log(
        boxen(
            chalk.white.bold('🧬 Genomic Self-Evolving Prompts for AI Agents\n') +
            chalk.gray('World\'s First Auto-Evolving AI System'),
            {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'cyan',
            }
        )
    );
}

// Main CLI
program
    .name('create-gsep')
    .description('Create a new GSEP agent project')
    .version('0.1.0')
    .argument('[project-name]', 'Project name')
    .option('--template <template>', 'Project template (chatbot|code-assistant|customer-support|custom)')
    .option('--llm <provider>', 'LLM provider (anthropic|openai|both)')
    .option('--storage <type>', 'Storage type (postgres|memory)')
    .option('--boost', 'Enable Evolution Boost 2.0')
    .option('--living-agent', 'Enable Living Agent v0.6.0 (10 cognitive layers)')
    .option('--skip-install', 'Skip dependency installation')
    .action(async (projectName, options) => {
        try {
            displayBanner();

            // Get project name
            let name = projectName;
            if (!name) {
                const { projectName: inputName } = await import('inquirer').then(inquirer =>
                    inquirer.default.prompt([
                        {
                            type: 'input',
                            name: 'projectName',
                            message: 'Project name:',
                            default: 'my-gsep-agent',
                            validate: (input: string) => {
                                if (!input) return 'Project name is required';
                                if (!/^[a-z0-9-]+$/.test(input)) {
                                    return 'Project name must be lowercase with hyphens only';
                                }
                                return true;
                            },
                        },
                    ])
                );
                name = inputName;
            }

            // Auto-detect existing agent runtime
            console.log(chalk.cyan('\n🔍 Scanning project for existing agent...\n'));
            const detection = await detectRuntime(process.cwd());
            console.log(formatDetectionResult(detection));
            console.log('');

            console.log(chalk.cyan('📋 Let\'s configure your GSEP agent...\n'));

            // Prompt user for configuration
            const config = await promptUser(options);
            config.gsepMode = detection.gsepMode;
            config.detectedFramework = detection.framework;

            // Generate project
            console.log(chalk.cyan('\n🏗️  Creating project structure...\n'));
            await generateProject(name, config);

            // Install dependencies
            if (!options.skipInstall) {
                console.log(chalk.cyan('\n📦 Installing dependencies...\n'));
                await installDependencies(name, config);
            }

            // Success message
            displaySuccessMessage(name, config);

        } catch (error) {
            console.error(chalk.red('\n❌ Error:'), error);
            process.exit(1);
        }
    });

function displaySuccessMessage(projectName: string, config: any) {
    console.log('\n');
    console.log(
        boxen(
            chalk.green.bold('🎉 Success! Your GSEP agent is ready.\n\n') +
            chalk.white('Next steps:\n') +
            chalk.cyan(`  cd ${projectName}\n`) +
            chalk.cyan('  npm run dev\n\n') +
            chalk.white('Features enabled:\n') +
            chalk.gray(`  • LLM: ${config.llmProvider}\n`) +
            chalk.gray(`  • Storage: ${config.storage}\n`) +
            chalk.gray(`  • Evolution Boost: ${config.evolutionBoost ? 'Yes (10x faster!)' : 'No'}\n`) +
            chalk.gray(`  • Living Agent: ${config.livingAgent ? 'Yes (10 cognitive layers!)' : 'No'}\n`) +
            chalk.gray(`  • Template: ${config.template}\n\n`) +
            chalk.white('Documentation: ') + chalk.cyan('https://gsepcore.com/docs\n') +
            chalk.white('Discord: ') + chalk.cyan('https://discord.gg/7rtUa6aU'),
            {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'green',
            }
        )
    );
}

program.parse();
