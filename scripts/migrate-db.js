const { loadEnvConfig } = require('@next/env');
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

loadEnvConfig(process.cwd());

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');

async function ensureMigrationsTable(sql) {
  await sql`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `;
}

async function listAppliedMigrations(sql) {
  const rows = await sql`select id from schema_migrations order by id`;
  return new Set(rows.map((row) => row.id));
}

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

async function applyMigration(sql, file) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8').trim();

  if (!content) {
    throw new Error(`Migration ${file} is empty`);
  }

  await sql.begin(async (tx) => {
    await tx.unsafe(content);
    await tx`insert into schema_migrations (id) values (${file})`;
  });
}

async function migrate(options = {}) {
  const databaseUrl = process.env.DATABASE_URL;
  const quiet = options.quiet ?? false;

  if (!databaseUrl) {
    if (!quiet) {
      console.warn(
        '[db:migrate] DATABASE_URL is not set — skipping migrations. Add a Postgres URI to .env.local (Supabase → Database → Connection string).'
      );
    }
    return { applied: 0, skipped: true };
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
    onnotice: (notice) => {
      // Harmless when ensureMigrationsTable runs on every start.
      if (notice.code === '42P07') return;
      if (!quiet) {
        console.warn(`[db:migrate] ${notice.message ?? notice}`);
      }
    },
  });

  try {
    await ensureMigrationsTable(sql);
    const applied = await listAppliedMigrations(sql);
    const files = listMigrationFiles();

    if (options.baseline) {
      let marked = 0;
      for (const file of files) {
        if (applied.has(file)) {
          continue;
        }
        await sql`insert into schema_migrations (id) values (${file})`;
        marked += 1;
      }
      console.log(
        marked
          ? `[db:migrate] Marked ${marked} migration(s) as applied (baseline).`
          : '[db:migrate] Baseline already up to date.'
      );
      return { applied: marked, skipped: false, baseline: true };
    }

    if (options.status) {
      const pending = files.filter((file) => !applied.has(file));
      console.log(`[db:migrate] Applied: ${applied.size}/${files.length}`);
      if (pending.length === 0) {
        console.log('[db:migrate] No pending migrations.');
      } else {
        console.log('[db:migrate] Pending:');
        pending.forEach((file) => console.log(`  - ${file}`));
      }
      return { applied: 0, skipped: false, pending: pending.length };
    }

    let count = 0;

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      process.stdout.write(`[db:migrate] Applying ${file}… `);
      await applyMigration(sql, file);
      process.stdout.write('done\n');
      count += 1;
    }

    if (count === 0) {
      if (!quiet) {
        console.log('[db:migrate] Database is up to date.');
      }
    } else {
      console.log(`[db:migrate] Applied ${count} migration(s).`);
    }

    return { applied: count, skipped: false };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function readCliOptions() {
  const args = process.argv.slice(2);
  return {
    baseline: args.includes('--baseline'),
    status: args.includes('--status'),
    quiet: args.includes('--quiet'),
  };
}

function formatMigrateError(error) {
  const message = error.message ?? String(error);

  if (message.includes('URI malformed')) {
    return '[db:migrate] Failed: DATABASE_URL is not a valid URI. Copy the Session pooler URI from Supabase → Connect.';
  }

  if (message.includes('ENOTFOUND') && message.includes('db.') && message.includes('.supabase.co')) {
    return [
      '[db:migrate] Failed: direct host db.<project>.supabase.co is IPv6-only and unreachable on this network.',
      'Use the Session pooler URI from Supabase → Connect → Session pooler (port 5432), e.g.:',
      'postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres',
    ].join('\n');
  }

  if (message.includes('password authentication failed')) {
    return [
      '[db:migrate] Failed: wrong database password in DATABASE_URL.',
      'Fix: Supabase → Connect → Session pooler → copy URI (port 5432) into DATABASE_URL.',
    ].join('\n');
  }

  return `[db:migrate] Failed: ${message}`;
}

if (require.main === module) {
  migrate(readCliOptions()).catch((error) => {
    console.error(formatMigrateError(error));
    process.exit(1);
  });
}

module.exports = { migrate };
