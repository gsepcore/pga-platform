/**
 * GSEP PostgreSQL Quickstart
 *
 * Demonstrates using GSEP with PostgreSQL for persistent storage.
 * Data survives process restarts — genomes, DNA profiles, and evolution
 * history are all stored in your database.
 *
 * Setup:
 *   1. createdb gsep
 *   2. DATABASE_URL="postgresql://localhost:5432/gsep" npx tsx examples/postgres-quickstart.ts
 *
 * Tables are auto-created on first run (9 tables).
 */

import { GSEP } from '../packages/core/src/index.js';
import { PostgresAdapter } from '../packages/adapters-storage/postgres/src/index.js';

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.log('⚠ DATABASE_URL not set. Example:');
        console.log('  DATABASE_URL="postgresql://localhost:5432/gsep" npx tsx examples/postgres-quickstart.ts');
        process.exit(1);
    }

    // Initialize PostgreSQL storage — tables are auto-created
    const storage = new PostgresAdapter({ connectionString: databaseUrl });
    await storage.initialize();
    console.log('✓ PostgreSQL connected and tables initialized');

    const gsep = new GSEP({ storage });
    await gsep.initialize();

    // Create a genome — persists in database
    const genome = await gsep.createGenome({
        name: 'persistent-agent',
        config: { autonomous: { continuousEvolution: true, evolveEveryN: 10 } },
    });

    await genome.addAllele(0, 'identity', 'default', 'You are a helpful coding assistant.');
    await genome.addAllele(1, 'approach', 'default', 'Provide clear, concise code examples.');
    console.log(`✓ Genome created: ${genome.id}`);

    // Verify persistence — reload from database
    const reloaded = await gsep.loadGenome(genome.id);
    if (reloaded) {
        console.log(`✓ Genome reloaded from PostgreSQL: ${reloaded.name}`);
    }

    // Clean up
    await storage.close();
    console.log('\n✅ PostgreSQL quickstart completed!');
}

main().catch(console.error);
