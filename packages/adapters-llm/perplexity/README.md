# @gsep/adapters-llm-perplexity

> Perplexity adapter for GSEP — web-search powered self-evolving agents

Your agent can search the web in real-time while evolving its prompts.

## Installation

```bash
npm install @gsep/core @gsep/adapters-llm-perplexity
```

## Usage

```typescript
import { PGA } from '@gsep/core';
import { PerplexityAdapter } from '@gsep/adapters-llm-perplexity';

const pga = new PGA({
  llm: new PerplexityAdapter({
    apiKey: process.env.PERPLEXITY_API_KEY!,
    model: 'sonar-pro',
  }),
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Perplexity API key |
| `model` | `string` | `'sonar-pro'` | Model to use |
| `temperature` | `number` | `0.7` | Temperature (0-2) |
| `searchRecency` | `string` | — | Filter results: `'month'`, `'week'`, `'day'`, `'hour'` |

## Supported Models

- `sonar-pro` (recommended — best quality with web search)
- `sonar` (fast with web search)

## License

MIT
