# @gsep/adapters-storage-postgres

> PostgreSQL storage adapter for GSEP (Genomic Self-Evolving Prompts)

## Installation

```bash
npm install @gsep/core @gsep/adapters-storage-postgres
```

## Usage

```typescript
import { GSEP } from '@gsep/core';
import { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';
import { PostgresAdapter } from '@gsep/adapters-storage-postgres';

const gsep = new GSEP({
  llm: new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
  storage: new PostgresAdapter({
    connectionString: process.env.DATABASE_URL,
    autoInitialize: true, // Creates tables automatically
  }),
});

await gsep.initialize();

const genome = await gsep.createGenome({ name: 'my-assistant' });
const response = await genome.chat('Hello!', { userId: 'user123' });

console.log(response);
```

## Configuration

### `PostgresAdapter(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `connectionString` | `string` | required | PostgreSQL connection string |
| `maxConnections` | `number` | `20` | Maximum pool size |
| `autoInitialize` | `boolean` | `true` | Auto-create database schema |

### Connection String Format

```
postgresql://user:password@host:port/database
```

**Example:**
```
postgresql://postgres:secret@localhost:5432/gsep
```

## Database Schema

The adapter automatically creates the following tables:

- `gsep_genomes` - Genome metadata
- `gsep_alleles` - Gene alleles (Layer 0, 1, 2)
- `gsep_user_dna` - User cognitive profiles
- `gsep_interactions` - Interaction logs
- `gsep_mutations` - Mutation history
- `gsep_feedback` - User feedback signals
- `gsep_analytics` - Pre-aggregated stats

See [`sql/schema.sql`](./sql/schema.sql) for full schema.

## Manual Schema Setup

If you prefer to manage migrations yourself:

```typescript
const adapter = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  autoInitialize: false, // Don't auto-create tables
});

// Run your own migrations
await runMigrations();

// Then initialize GSEP (will skip schema creation)
await gsep.initialize();
```

## Performance

### Connection Pooling

The adapter uses `pg` connection pooling by default:

```typescript
const adapter = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  maxConnections: 50, // Increase for high load
});
```

### Indexes

All critical queries are indexed:
- Genome lookups: `gsep_genomes(id)`
- Allele selection: `gsep_alleles(genome_id, layer, gene, status)`
- User DNA: `gsep_user_dna(user_id, genome_id)`
- Analytics queries: All have composite indexes

## Production Checklist

✅ Use connection pooling (`maxConnections: 20+`)
✅ Enable SSL for remote databases
✅ Set up database backups
✅ Monitor connection pool usage
✅ Use read replicas for analytics queries
✅ Consider partitioning `gsep_interactions` table for high volume

## Troubleshooting

### "relation does not exist" error

```typescript
// Ensure autoInitialize is true
const adapter = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  autoInitialize: true, // ← This creates tables
});

await gsep.initialize();
```

### Connection timeout

```typescript
// Increase max connections
const adapter = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  maxConnections: 50, // Default is 20
});
```

### SSL connection required

```
postgresql://user:pass@host:5432/db?sslmode=require
```

## License

MIT © Luis Alfredo Velasquez Duran
