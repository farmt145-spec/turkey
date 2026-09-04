#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
=== Indykpol: setup MySQL na Railway ===

1) Załóż konto:
   https://railway.app/

2) Utwórz projekt:
   Dashboard -> New Project -> Blank Project
   Nazwa: indykpol-railway

3) Dodaj bazę MySQL:
   W projekcie kliknij "+ New" -> Database -> MySQL
   Poczekaj aż status usługi będzie "Running"

4) Pobierz connection string:
   Otwórz usługę MySQL -> Variables / Connect
   Skopiuj wartość DATABASE_URL

5) Wklej URL do Netlify jako:
   DATABASE_URL=******HOST:PORT/DB_NAME
   DATABASE_TYPE=mysql

6) Uzupełnij pozostałe zmienne z .env.production i wdroż aplikację.

Uwaga:
- Finalny krok dla Render i Railway jest taki sam (zmienne w Netlify + test aplikacji).
- Różni się tylko źródło wartości DATABASE_URL.

Gotowe. Pełna instrukcja: DEPLOYMENT_GUIDE_RAILWAY.md
EOF
