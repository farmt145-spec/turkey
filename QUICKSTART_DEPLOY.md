# 🚀 QUICK START - Deploy w 10 minut!

## KROK 1️⃣: Utwórz bazę MySQL na Railway (2 min)

1. Wejdź: **https://railway.app**
2. Kliknij **Start a New Project**
3. Zaloguj się GitHub lub utwórz konto
4. W dashboardzie: **+ New** → **Database** → **MySQL**
5. Czekaj aż status zmieni się na **Running** ✅

---

## KROK 2️⃣: Skopiuj connection string (1 min)

1. Kliknij na MySQL service
2. Wejdź w **Variables** tab
3. Skopiuj wartość `DATABASE_URL`
   - Format: `mysql://root:PASSWORD@hostname.railway.internal:3306/railway`
4. **Zapisz sobie ten tekst!** ⬇️

**Przykład:**
```
mysql://root:abc123def456@railway.railway.internal:3306/railway
```

---

## KROK 3️⃣: Wygeneruj sekrety (1 min)

W terminalu uruchom:

```bash
node scripts/generate-secrets.js
```

Będzie output:
```
SESSION_SECRET=abc123def456...xyz789
API_KEY_PEPPER=xyz789uvw012...abc123
```

**Zapisz sobie oba!** ⬇️

---

## KROK 4️⃣: Połącz repozytorium z Netlify (3 min)

1. Wejdź: **https://app.netlify.com**
2. Kliknij **Add new site** → **Import an existing project**
3. Wybierz GitHub
4. Szukaj: `farmt145-spec/turkey` → Kliknij
5. **Build settings** - powinny się auto-fill:
   - ✅ Base directory: `app`
   - ✅ Build command: `npm install --legacy-peer-deps && npm run build`
   - ✅ Publish directory: `dist/public`
   - ✅ Functions directory: `netlify/functions`
6. Kliknij **Save & Deploy** (będzie błąd - normalne, nie mamy env vars)

---

## KROK 5️⃣: Dodaj zmienne do Netlify (2 min)

1. W Netlify, idź do **Site configuration** → **Environment variables**
2. Kliknij **+ Add a single variable** i dodaj KAŻDĄ:

```
KEY: DATABASE_TYPE
VALUE: mysql

KEY: DATABASE_URL
VALUE: [WKLEJ swoją z Railway - krok 2️⃣]

KEY: SESSION_SECRET
VALUE: [WKLEJ z generate-secrets.js - krok 3️⃣]

KEY: API_KEY_PEPPER
VALUE: [WKLEJ drugie hasło z generate-secrets.js - krok 3️⃣]

KEY: NODE_ENV
VALUE: production

KEY: DEMO_MODE
VALUE: true

KEY: DEMO_COMPANY_ID
VALUE: 1

KEY: VITE_DEMO_MODE
VALUE: true
```

**To 8 zmiennych!** Dodaj wszystkie.

---

## KROK 6️⃣: Wdróż! (2 min)

1. W Netlify: **Deployments** tab
2. Kliknij **Trigger deploy** → **Deploy site**
3. Czekaj 2-3 minuty
4. Powinno być: `Published` ✅

---

## ✨ GOTOWE! Aplikacja działa!

Otwórz swój URL z Netlify (będzie coś jak: `https://turkey-abc123.netlify.app`)

Powinieneś zobaczyć:
- ✅ Aplikacja załadowana
- ✅ Demo data widoczna
- ✅ Możliwość klikania po UI
- ✅ Brak błędów w konsoli (F12)

---

## 🆘 Coś nie działa?

### "Build failed"
→ Sprawdzić zmienne env w Netlify  
→ Kliknąć **Trigger deploy** ponownie  
→ Czekać 3 minuty

### "Database connection error"
→ Sprawdzić `DATABASE_URL` z Railway  
→ Upewnić się że Railway MySQL ma status "Running"  
→ Hasło w URL musi być poprawne

### "Page ładuje się ale brak danych"
→ Czekać 60 sekund (seeding danych)  
→ Hard refresh: Ctrl+F5
→ Sprawdzić console (F12)

---

## 📋 Checklist DEPLOYMENTU

- [ ] Railway MySQL działa
- [ ] Skopiowałem DATABASE_URL
- [ ] Wygenerowałem sekrety
- [ ] Podłączyłem repozytorium do Netlify
- [ ] Dodałem 8 zmiennych do Netlify
- [ ] Kliknąłem "Trigger deploy"
- [ ] Czekałem 2-3 minuty
- [ ] Aplikacja działa ✅

---

## 🎯 GOTOWE!

**Twoja aplikacja Bloody Turkey ERP działa w PRODUKCJI!** 🎉

Możesz teraz:
- ✅ Przeglądać demo dane
- ✅ Dodawać nowe firmy
- ✅ Tworzyć receptury i normy
- ✅ Pracować z całym systemem

---

**Pytania? Coś nie działa?** Daj znać! 🚀
