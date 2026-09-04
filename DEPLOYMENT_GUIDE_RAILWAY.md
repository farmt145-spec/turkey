# Deployment Guide (Netlify + Railway MySQL) — Indykpol

Poniżej jest alternatywny, produkcyjny proces wdrożenia aplikacji Indykpol z bazą MySQL na Railway i frontendem/API na Netlify.

## 1) Rejestracja w Railway

1. Wejdź na: https://railway.app/
2. Kliknij **Start a New Project** i zaloguj się (najprościej przez GitHub).
3. Zweryfikuj konto i otwórz dashboard.

## 2) Utworzenie projektu Railway

1. W dashboardzie kliknij **New Project**.
2. Wybierz pusty projekt (blank project) lub nowy projekt z szablonu.
3. Nadaj nazwę, np. `indykpol-railway`.

## 3) Wdrożenie MySQL na Railway

1. W projekcie kliknij **+ New**.
2. Wybierz **Database** → **MySQL**.
3. Poczekaj aż usługa osiągnie status **Running**.
4. Wejdź w zakładkę zmiennych/połączenia usługi MySQL i skopiuj connection string.

## 4) Connection string z Railway

`DATABASE_URL` z Railway powinien mieć format:

```env
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

To jest jedyna różnica względem wariantu Render — końcowo w Netlify ustawiasz te same zmienne, ale `DATABASE_URL` bierzesz z Railway.

## 5) Ustawienie zmiennych w Netlify

1. Użyj template: `/home/runner/work/Indykpol/Indykpol/.env.production`
2. W Netlify otwórz:
   - **Site configuration** → **Environment variables**
3. Dodaj:

```env
NODE_ENV=production
DATABASE_TYPE=mysql
DATABASE_URL=******HOST:PORT/DATABASE
SESSION_SECRET=<wygenerowany_sekret>
API_KEY_PEPPER=<wygenerowany_sekret>
DEMO_MODE=true
DEMO_COMPANY_ID=1
VITE_DEMO_MODE=true
```

Sekrety wygenerujesz:

```bash
node /home/runner/work/Indykpol/Indykpol/scripts/generate-secrets.js
```

## 6) Zalety Railway (kiedy wybrać zamiast Render)

- Natywne wsparcie MySQL i prostsza konfiguracja bazy
- Elastyczna cena pay-per-use
- Szybsze deploye (zwykle ~30–90 sekund)
- Skalowanie w dół do 0 (brak opłat za nieużywane zasoby)
- Lepszy wybór dla aplikacji ze zmiennym obciążeniem

## 7) Wdrożenie i testy post-deployment

1. Podłącz repo `fendt6141/Indykpol` do Netlify.
2. Upewnij się, że wszystkie zmienne środowiskowe są zapisane.
3. Uruchom deploy.
4. Po wdrożeniu sprawdź:
   - Strona główna ładuje się bez logowania
   - Tryb demo działa (`DEMO_MODE=true`)
   - Dodawanie własnej firmy działa w module „Struktura”
   - Endpointy odpowiadają:
     - `/api/demo-login`
     - `/api/trpc/*`

## 8) Szybka checklista (Railway)

- [ ] MySQL działa na Railway
- [ ] `DATABASE_URL` z Railway ustawione w Netlify
- [ ] Pozostałe zmienne i sekrety ustawione w Netlify
- [ ] Deploy zakończony sukcesem
- [ ] Testy ręczne wykonane
