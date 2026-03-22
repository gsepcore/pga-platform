# @gsep/server

Secure Evolution Server for GSEP — exposes Pull/Push API endpoints for external agents to participate in genomic prompt evolution.

## Features

- **Pull API** — agents fetch their current evolved genome
- **Push API** — agents submit interaction feedback for evolution
- **Rate Limiting** — built-in `@fastify/rate-limit` protection
- **Auth-ready** — HMAC signature verification for trusted agents

## Installation

```bash
npm install @gsep/server
```

## Quick Start

```typescript
import { createServer } from '@gsep/server';

const server = await createServer({
  port: 3000,
  genome: myGenome,
  storage: myStorageAdapter,
});

await server.listen();
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/genome/:id` | Pull current genome for agent |
| `POST` | `/feedback` | Push interaction feedback |
| `GET` | `/health` | Health check |

## License

MIT
