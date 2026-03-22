# @gsep/adapters-llm-anthropic

> Anthropic Claude adapter for GSEP (Genomic Self-Evolving Prompts)

## Installation

```bash
npm install @gsep/core @gsep/adapters-llm-anthropic
```

## Usage

```typescript
import { PGA } from '@gsep/core';
import { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';
import { PostgresAdapter } from '@gsep/adapters-storage-postgres';

const pga = new PGA({
  llm: new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4.5-20250929', // optional
  }),
  storage: new PostgresAdapter({
    connectionString: process.env.DATABASE_URL,
  }),
});

await pga.initialize();

const genome = await pga.createGenome({ name: 'my-assistant' });
const response = await genome.chat('Hello!', { userId: 'user123' });

console.log(response);
```

## Configuration

### `ClaudeAdapter(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Anthropic API key |
| `model` | `string` | `'claude-sonnet-4.5-20250929'` | Claude model to use |
| `maxRetries` | `number` | `2` | Max retries on failure |
| `timeout` | `number` | `60000` | Timeout in milliseconds |

## Supported Models

- `claude-sonnet-4.5-20250929` (recommended)
- `claude-opus-4-6` (most capable)
- `claude-haiku-4-5-20251001` (fastest)

## License

MIT © Luis Alfredo Velasquez Duran
