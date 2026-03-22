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

### `pga init`

Initialize a new GSEP project with templates.

```bash
pga init                      # Interactive template selection
pga init --template basic     # Basic template
pga init --template advanced  # Advanced with monitoring
pga init --template enterprise # Enterprise-ready
pga init --dir ./my-project   # Specify directory
```

**Templates:**
- **basic** - Simple GSEP setup with Claude
- **advanced** - Multi-model support + monitoring
- **enterprise** - Production-ready with PostgreSQL

### `pga doctor`

Run diagnostics and check for issues.

```bash
pga doctor          # Run all checks
pga doctor --fix    # Attempt to fix issues
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
import { PGA, InMemoryStorageAdapter } from '@gsep/core';

const pga = new PGA({
  storage: new InMemoryStorageAdapter(),
});

await pga.initialize();
const genome = await pga.createGenome({ name: 'my-assistant' });
```

### Advanced Template

Multi-model support with monitoring.

```typescript
import { PGA, MetricsCollector } from '@gsep/core';
import { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';

const pga = new PGA({
  llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  storage: new InMemoryStorageAdapter(),
});
```

### Enterprise Template

Production-ready with all features.

```typescript
import { PGA } from '@gsep/core';
import { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';
import { PostgresAdapter } from '@gsep/adapters-storage-postgres';

const pga = new PGA({
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
DATABASE_URL=postgresql://localhost/pga
```

## Quick Start

```bash
# 1. Create new project
pga init --template basic

# 2. Navigate to project
cd my-pga-project

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
git clone https://github.com/gsepcore/pga-platform

# Navigate to CLI package
cd packages/cli

# Install dependencies
npm install

# Build
npm run build

# Test locally
npm link
pga --help
```

## License

MIT

## Author

**Luis Alfredo Velasquez Duran** (Germany, 2025)

## Links

- [GSEP Core](../../README.md)
- [Documentation](https://gsepcore.com)
- [GitHub](https://github.com/gsepcore/pga-platform)
