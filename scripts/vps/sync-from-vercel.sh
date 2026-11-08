#!/usr/bin/env bash
# One-way copy of the Vercel database (Prisma Postgres) into lch_ins. The source is only read.
# Data entered directly on the VPS is replaced on every run.
set -euo pipefail

APP=/data/workspace/app
exec 9>/run/lch-sync.lock
flock -n 9 || { echo "$(date -Is) skip: previous run still active"; exit 0; }

SRC=$(cat "$APP/.env.vercel-source")
export SRC
DUMP=$(mktemp /tmp/lch-sync.XXXXXX.sql)
trap 'rm -f "$DUMP"' EXIT

pg() { docker exec -i lch_postgres psql -U lch -XAtq -v ON_ERROR_STOP=1 "$@"; }
has_db() { [ "$(pg -d postgres -c "select count(*) from pg_database where datname='$1'")" = 1 ]; }

echo "$(date -Is) start"

# The source runs Postgres 17 and lch_postgres is 16, so dump with a 17 client as plain SQL.
docker run --rm --network host -e SRC -e PGOPTIONS='-c default_transaction_read_only=on' postgres:17-alpine \
  sh -c 'pg_dump "$SRC" -n public --no-owner --no-privileges' | grep -v '^SET transaction_timeout' > "$DUMP"
grep -q '^COPY public._prisma_migrations ' "$DUMP" || { echo "$(date -Is) fail: dump incomplete"; exit 1; }

pg -d postgres -c 'drop database if exists lch_ins_next' -c 'create database lch_ins_next'
pg -d lch_ins_next -c 'drop schema public cascade'
pg -d lch_ins_next -1 < "$DUMP" > /dev/null

# The VPS app runs its own migrations on deploy; never swap in a schema it does not expect.
Q="select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null order by 1"
if [ "$(pg -d lch_ins_next -c "$Q")" != "$(pg -d lch_ins -c "$Q")" ]; then
  pg -d postgres -c 'drop database lch_ins_next'
  echo "$(date -Is) skip: migration list differs between Vercel and VPS"
  exit 1
fi

recover() {
  if ! has_db lch_ins && has_db lch_ins_prev; then pg -d postgres -c 'alter database lch_ins_prev rename to lch_ins'; fi
  pg -d postgres -c 'alter database lch_ins allow_connections true' || true
  echo "$(date -Is) fail: swap aborted, previous data kept"
}

pg -d postgres -c 'drop database if exists lch_ins_prev'
if ! pg -d postgres \
  -c 'alter database lch_ins allow_connections false' \
  -c "select pg_terminate_backend(pid, 5000) from pg_stat_activity where datname='lch_ins'" \
  -c 'alter database lch_ins rename to lch_ins_prev' \
  -c 'alter database lch_ins_next rename to lch_ins' > /dev/null; then
  recover
  exit 1
fi
pg -d postgres -c 'alter database lch_ins_prev allow_connections true'

echo "$(date -Is) done: $(pg -d lch_ins -c "select 'policies='||(select count(*) from policies)||' claims='||(select count(*) from claims)||' slips='||(select count(*) from placing_slips)||' files='||(select count(*) from stored_files)")"
