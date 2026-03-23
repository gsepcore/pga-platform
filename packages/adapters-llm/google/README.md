# @gsep/adapters-llm-google

> Google Gemini adapter for GSEP (Genomic Self-Evolving Prompts)

## Installation

```bash
npm install @gsep/core @gsep/adapters-llm-google
```

## Usage

```typescript
import { GSEP } from '@gsep/core';
import { GeminiAdapter } from '@gsep/adapters-llm-google';

const gsep = new GSEP({
  llm: new GeminiAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-2.0-flash',
  }),
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Google AI API key |
| `model` | `string` | `'gemini-2.0-flash'` | Gemini model to use |
| `temperature` | `number` | `0.7` | Temperature (0-2) |
| `maxRetries` | `number` | `2` | Max retries on failure |

## Supported Models

- `gemini-2.0-flash` (recommended — fast, capable)
- `gemini-1.5-pro` (most capable)
- `gemini-1.5-flash` (fastest)

## License

MIT
