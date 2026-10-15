#!/usr/bin/env bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_db="$POSTGRES_DB" \
  --set=test_db="$POSTGRES_TEST_DB" \
  --set=app_password="$APP_USER_PASSWORD" <<'EOSQL'
SELECT format('CREATE DATABASE %I', :'test_db') \gexec
CREATE ROLE app_user LOGIN PASSWORD :'app_password';
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'app_db') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO app_user', :'app_db') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'test_db') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO app_user', :'test_db') \gexec
EOSQL

for db in "$POSTGRES_DB" "$POSTGRES_TEST_DB"; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<'EOSQL'
GRANT USAGE ON SCHEMA public TO app_user;
EOSQL
done
