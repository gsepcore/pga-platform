/**
 * GSEP CLI - Chat Command
 *
 * @author Luis Alfredo Velasquez Duran (Germany, 2025)
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

interface ChatOptions {
    user?: string;
}

export async function chat(genomeId: string | undefined, options: ChatOptions): Promise<void> {
    console.log(chalk.bold('\n💬 Interactive Chat Session\n'));

    // Prompt for genome if not provided
    if (!genomeId) {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'genomeId',
                message: 'Enter genome ID:',
                validate: (input: string) => {
                    if (!input.trim()) {
                        return 'Genome ID is required';
                    }
                    return true;
                },
            },
        ]);

        genomeId = answers.genomeId;
    }

    const userId = options.user || 'cli-user';

    console.log(chalk.gray(`Genome: ${genomeId}`));
    console.log(chalk.gray(`User: ${userId}`));
    console.log(chalk.gray('Type "exit" or "quit" to end the session\n'));

    // Chat loop
    while (true) {
        const { message } = await inquirer.prompt([
            {
                type: 'input',
                name: 'message',
                message: chalk.cyan('You:'),
                validate: (input: string) => {
                    if (!input.trim()) {
                        return 'Message cannot be empty';
                    }
                    return true;
                },
            },
        ]);

        // Check for exit commands
        if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
            console.log(chalk.yellow('\nEnding chat session. Goodbye!\n'));
            break;
        }

        // Send message
        const spinner = ora('Thinking...').start();

        try {
            // TODO: Integrate with actual GSEP instance
            // For now, show a placeholder response
            await new Promise((resolve) => setTimeout(resolve, 1000));

            spinner.stop();

            const response = `[This is a placeholder response. Connect to GSEP instance to get real responses]

Your message: "${message}"

To connect this CLI to a live GSEP instance:
1. Initialize a GSEP instance in your application
2. Expose it via API or IPC
3. Configure the CLI to connect to it

For now, this command demonstrates the interactive chat interface.`;

            console.log(chalk.green('AI:'), chalk.white(response));
            console.log();
        } catch (error) {
            spinner.fail(chalk.red('Failed to get response'));
            console.error(error);
        }
    }
}
