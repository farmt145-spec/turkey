# Deployment Guide (Netlify + Render MySQL) — Indykpol

Poniżej jest kompletny, produkcyjny proces wdrożenia aplikacji Indykpol bez logowania (demo + możliwość dodawania własnych firm).

## 1) Rejestracja w Render

1. Wejdź na: https://dashboard.render.com/register  
2. Załóż konto (najprościej przez GitHub).
3. Zweryfikuj e-mail i zaloguj się do panelu.

## 2) Utworzenie bazy MySQL na Render

1. W panelu Render kliknij **New**.
2. Wybierz **MySQL**.
3. Ustaw:
   - **Name**: `indykpol-mysql`
   - **Database**: `indykpol`
   - **User**: `indykpol_user` (lub własny)
   - **Region**: najlepiej ten sam co frontend (np. EU)
   - **Plan**: produkcyjny/stabilny (zgodnie z budżetem)
4. Kliknij **Create Database**.
5. Po utworzeniu przejdź do zakładki **Connections** i skopiuj URL połączenia.

## 3) Ustawienie CONNECTION STRING

W Render skopiowany URL powinien mieć format:

```env
mysql://USER:PASSWORD@HOST:3306/DATABASE
```

Ten URL wpisz jako `DATABASE_URL` w Netlify.

## 4) Przygotowanie i wklejenie zmiennych do Netlify

1. W repo użyj template: `/home/runner/work/Indykpol/Indykpol/.env.production`
2. Wejdź do Netlify:
   - **Site configuration** → **Environment variables**
3. Dodaj zmienne:

```env
NODE_ENV=production
DATABASE_TYPE=mysql
DATABASE_URL=******HOST:3306/DATABASE
SESSION_SECRET=<wygenerowany_sekret>
API_KEY_PEPPER=<wygenerowany_sekret>
DEMO_MODE=true
DEMO_COMPANY_ID=1
VITE_DEMO_MODE=true
```

## 5) Jakie sekrety wygenerować

Wygeneruj sekrety lokalnie:

```bash
node /home/runner/work/Indykpol/Indykpol/scripts/generate-secrets.js
```

Skrypt zapisze sekrety do pliku:

```bash
/tmp/indykpol-secrets.env
```

Podejrzyj je lokalnie:

```bash
cat /tmp/indykpol-secrets.env
```

Następnie usuń plik:

```bash
rm /tmp/indykpol-secrets.env
```

Wklej wartości do Netlify Environment Variables.

## 6) Konfiguracja Netlify build

W repo przygotowany jest plik:

- `/home/runner/work/Indykpol/Indykpol/.netlify.toml`

Konfiguracja zakłada:
- build z katalogu `app`
- publikację `dist/public`
- Netlify Functions z katalogu `netlify/functions`
- przekierowania API:
  - `/api/trpc/*`
  - `/api/demo-login`

## 7) Wdrożenie aplikacji

1. W Netlify podłącz repozytorium `fendt6141/Indykpol`.
2. Upewnij się, że zmienne środowiskowe są zapisane.
3. Uruchom deploy.
4. Po zakończeniu otwórz URL aplikacji.

## 8) Testy po wdrożeniu

Sprawdź:
1. Czy strona główna ładuje się bez logowania.
2. Czy tryb demo działa (`DEMO_MODE=true`).
3. Czy można dodać własną firmę w module „Struktura”.
4. Czy endpointy funkcji odpowiadają:
   - `/api/demo-login`
   - `/api/trpc/*`

## 9) Szybka checklista produkcyjna

- [ ] MySQL działa na Render
- [ ] `DATABASE_URL` ustawione w Netlify
- [ ] Sekrety wygenerowane i zapisane w Netlify
- [ ] `DEMO_MODE=true` i `VITE_DEMO_MODE=true`
- [ ] Deploy zakończony sukcesem
- [ ] Testy ręczne wykonane
