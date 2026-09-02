#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
=== Indykpol: setup MySQL na Render ===

1) Załóż konto:
   https://dashboard.render.com/register

2) Utwórz bazę:
   Dashboard -> New -> PostgreSQL/MySQL -> wybierz "MySQL"
   Nazwa: indykpol-mysql
   Region: ten sam co Netlify (zalecane EU/Frankfurt)
   Plan: Production lub Starter

3) Po utworzeniu bazy wejdź w "Connections" i skopiuj:
   - Internal Database URL
   - External Database URL (jeśli potrzebujesz połączeń zewnętrznych)

4) Wklej URL do Netlify jako:
   DATABASE_URL=******HOST:3306/DB_NAME
   DATABASE_TYPE=mysql

5) Uzupełnij pozostałe zmienne z .env.production i wdroż aplikację.

Gotowe. Pełna instrukcja: DEPLOYMENT_GUIDE.md
EOF
