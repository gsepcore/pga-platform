# @pga-ai/adapters-llm-ollama

> Ollama adapter for PGA — use local LLMs with self-evolving prompts

No API keys needed. Run any open-source model locally.

## Installation

```bash
npm install @pga-ai/core @pga-ai/adapters-llm-ollama
```

## Prerequisites

Install and run [Ollama](https://ollama.com):

```bash
# Install Ollama, then:
ollama pull llama3
ollama serve
```

## Usage

```typescript
import { PGA } from '@pga-ai/core';
import { OllamaAdapter } from '@pga-ai/adapters-llm-ollama';

const pga = new PGA({
  llm: new OllamaAdapter({
    model: 'llama3',
  }),
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | `string` | required | Ollama model name |
| `baseURL` | `string` | `'http://localhost:11434'` | Ollama server URL |
| `temperature` | `number` | `0.7` | Temperature (0-2) |
| `timeout` | `number` | `120000` | Request timeout (ms) |

## Supported Models

Any model available in Ollama:

- `llama3` / `llama3.1` / `llama3.2`
- `mistral` / `mixtral`
- `deepseek-r1`
- `phi3` / `phi4`
- `qwen2` / `qwen2.5`
- `gemma2`
- And [hundreds more](https://ollama.com/library)

## Remote Ollama

Connect to Ollama running on a remote server:

```typescript
const llm = new OllamaAdapter({
  model: 'llama3',
  baseURL: 'http://your-gpu-server:11434',
});
```

## License

MIT
