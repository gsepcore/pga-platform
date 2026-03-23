# @gsep/cli

Interactive command-line interface for GSEP (Genomic Self-Evolving Prompts).

## Installation

### Global Installation (Recommended)

```bash
npm install -g @gsep/cli
```

### Local Installation

```bash
npm install --save-dev @gsep/cli
```

## Commands

### `gsep init`

Initialize a new GSEP project with templates.

```bash
gsep init                      # Interactive template selection
gsep init --template basic     # Basic template
gsep init --template advanced  # Advanced with monitoring
gsep init --template enterprise # Enterprise-ready
gsep init --dir ./my-project   # Specify directory
```

**Templates:**
- **basic** - Simple GSEP setup with Claude
- **advanced** - Multi-model support + monitoring
- **enterprise** - Production-ready with PostgreSQL

### `gsep doctor`

Run diagnostics and check for issues.

```bash
gsep doctor          # Run all checks
gsep doctor --fix    # Attempt to fix issues
```

**Checks:**
- Node.js version (requires 20+)
- TypeScript installation
- GSEP core package
- LLM adapters and API keys
- LLM connectivity

## Project Templates

### Basic Template

Simple GSEP setup for getting started quickly.

```typescript
import { GSEP, InMemoryStorageAdapter } from '@gsep/core';

const gsep = new GSEP({
  storage: new InMemoryStorageAdapter(),
});

await gsep.initialize();
const genome = await gsep.createGenome({ name: 'my-assistant' });
```

### Advanced Template

Multi-model support with monitoring.

```typescript
import { GSEP, MetricsCollector } from '@gsep/core';
import { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';

const gsep = new GSEP({
  llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  storage: new InMemoryStorageAdapter(),
});
```

### Enterprise Template

Production-ready with all features.

```typescript
import { GSEP } from '@gsep/core';
import { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';
import { PostgresAdapter } from '@gsep/adapters-storage-postgres';

const gsep = new GSEP({
  llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  storage: new PostgresAdapter({ connectionString: process.env.DATABASE_URL! }),
});
```

## Configuration

The CLI uses environment variables for configuration:

```bash
# Required
ANTHROPIC_API_KEY=your-api-key

# Optional
OPENAI_API_KEY=your-openai-key
DATABASE_URL=postgresql://localhost/gsep
```

## Quick Start

```bash
# 1. Create new project
gsep init --template basic

# 2. Navigate to project
cd my-gsep-project

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 5. Run the application
npm run dev
```

## Global Options

```bash
-v, --verbose     # Enable verbose output
--no-color        # Disable colored output
--help            # Show help for command
--version         # Show CLI version
```

## Development

```bash
# Clone repository
git clone https://github.com/gsepcore/gsep

# Navigate to CLI package
cd packages/cli

# Install dependencies
npm install

# Build
npm run build

# Test locally
npm link
gsep --help
```

## License

MIT

## Author

**Luis Alfredo Velasquez Duran** (Germany, 2025)

## Links

- [GSEP Core](../../README.md)
- [Documentation](https://gsepcore.com)
- [GitHub](https://github.com/gsepcore/gsep)
