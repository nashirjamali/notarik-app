#!/usr/bin/env bash
# First start of the production database: create the non-privileged role the API connects as (RLS applies to it).
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_db="$POSTGRES_DB" \
  --set=app_password="$APP_USER_PASSWORD" <<'EOSQL'
CREATE ROLE app_user LOGIN PASSWORD :'app_password';
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'app_db') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO app_user', :'app_db') \gexec
GRANT USAGE ON SCHEMA public TO app_user;
EOSQL
