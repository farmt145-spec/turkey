# BLOODY-TURKEY — ETAP 2: MODEL DANYCH

## STATUS
STATUS: W TRAKCIE PRZYGOTOWANIA MODELU DANYCH NA PODSTAWIE ISTNIEJĄCEGO SCHEMA

CO ZROBIONO:
- Został przeanalizowany aktualny schemat Drizzle w `app/db/schema.ts`.
- Został potwierdzony fakt, że projekt ma już mocny fundament architektoniczny.
- Zidentyfikowano główne obszary do rozszerzenia bez tworzenia równoległego systemu.
- Opracowano bezpieczną ścieżkę rozwoju: rozszerzać istniejące tabele i relacje, nie duplikować ich.

CO DZIAŁA:
- `feed_ingredients` istnieje i zawiera większość parametrów odżywczych.
- `nutritional_standards` istnieje i pełni rolę norm żywieniowych per faza / wiek / płeć.
- `recipes` i `recipe_items` już obsługują receptury i składniki.
- `batches`, `daily_logs`, `feed_usages`, `weighings`, `litter` są elementami produkcji i operacji stada.
- `farms`, `houses`, `sectors`, `warehouses`, `silos` tworzą warstwę gospodarstwa i magazynu.

CO NIE DZIAŁA / CO BRYKA:
- Brakuje jednego spójnego modelu dla grup wiekowych 1–8 z rozdzieleniem na indora i indyczkę.
- Brakuje pełnego modelu „dzień po dniu” dla piskląt.
- Brakuje kompletnej logiki bilansu receptury z parametrami i statusami PASS / WARNING / DEFICIT / EXCESS.
- Brakuje jawnej warstwy demo vs full environment.
- Brakuje jednoznacznej relacji między kurnikiem, stadem, grupą, normą i recepturą.

NASTĘPNY KROK:
- Przyjąć model danych zgodny z istniejącym `schema.ts` i rozszerzyć go bez niszczenia danych.
- Nie wchodzić jeszcze w kalkulator i nie zmieniać biznesowej logiki.

---

## 1. ZASADA ARCHITEKTONICZNA

Nie tworzymy nowego systemu.
Nie duplikujemy istniejących tabel.
Nie usuwamy danych.
Nie zmieniamy konfiguracji środowiska.
Nie ruszamy MySQL.

Zamiast tego:
- rozszerzamy istniejące modele
- doprecyzowujemy relacje
- dodajemy brakujące pola i tabele tylko tam, gdzie wymagają tego użyteczne obszary biznesowe
- zachowujemy kompatybilność z aktualnym workflow Drizzle + MySQL + TypeScript

---

## 2. MAPOWANIE DO ISTNIEJĄCYCH TABEL

### 2.1 SUROWCE
Istniejąca tabela:
- `feed_ingredients`

Obowiązujące pola w modelu obecnym:
- `name`
- `countryCode`
- `pricePerTon`
- `currency`
- `proteinPct`
- `energyKcal`
- `lysinePct`
- `methioninePct`
- `fiberPct`
- `fatPct`
- `calciumPct`
- `phosphorusPct`
- `stockTons`
- `moisturePct`
- `ashPct`
- `starchPct`
- `cystinePct`
- `threoninePct`
- `tryptophanPct`
- `argininePct`
- `sodiumPct`
- `producer`
- `code`
- `extraParams`

Wniosek:
- tabela `feed_ingredients` jest już właściwym miejscem dla surowców i jest zgodna z wymaganiami ETAPU 2.
- należy tylko uzupełnić model `extraParams` i standardy kontroli jakości
- w razie potrzeby dodać dodatkowe dane zewnętrzne: jednostka, własny/zakupiony, lokalizacja, typ surowca

### 2.2 NORMY ŻYWIENIOWE
Istniejąca tabela:
- `nutritional_standards`

Obecne pola:
- `name`
- `code`
- `gender`
- `productionType`
- `phase`
- `ageFromDays`
- `ageToDays`
- `targetWeightFromKg`
- `targetWeightToKg`
- `meMinKcal`, `meMaxKcal`
- `proteinMinPct`, `proteinMaxPct`
- `fatMinPct`, `fatMaxPct`
- `fiberMaxPct`
- `lysineMinPct`
- `methionineMinPct`
- `calciumMinPct`, `calciumMaxPct`
- `phosphorusMinPct`
- `sodiumMinPct`, `sodiumMaxPct`
- `extraParams`

Wniosek:
- zgodnie z wymaganiami ETAPU 2, ta tabela jest właściwym fundamentem dla grup 1–8, piskląt i norm żywieniowych.
- należy doprecyzować jej rolę jako standardu per grupa i płeć

### 2.3 RECEPTURY
Istniejące tabele:
- `recipes`
- `recipe_items`

Obecne pola:
- `recipes`: `name`, `ageGroup`, `strategy`, `costPerTon`, `proteinPct`, `energyKcal`, `lysinePct`, `explanation`, `version`, `author`, `status`, `sex`, `season`, `genetics`
- `recipe_items`: `recipeId`, `ingredientId`, `percent`

Wniosek:
- receptury są już gotowe pod podstawowy model receptury
- dopełniać je trzeba o:
  - grupa docelowa
  - płeć
  - dzień życia / wiek
  - cel żywieniowy
  - masa ptaka
  - bilans końcowy
  - koszt/kg i koszt/t
  - wersja i data

### 2.4 MAGAZYN
Istniejące tabele:
- `warehouses`
- `silos`
- `warehouse_lots`
- `warehouse_stock_items`
- `warehouse_movements`

Wniosek:
- magazyn ma już dobry fundament
- problemem nie jest brak tabel, tylko brak jasno zdefiniowanego rozróżnienia:
  - własny surowiec
  - zakupiony surowiec
  - wartość użytkowa vs wartość ekonomiczna

### 2.5 PRODUKCJA
Istniejące tabele:
- `batches`
- `weighings`
- `mortalities`
- `feed_usages`
- `daily_logs`
- `schedule_events`
- `selects`

Wniosek:
- ta warstwa jest już bliska modelowi produkcyjnemu z ETAPU 2
- wystarczy dodać spójne rozróżnienie kurnik → grupa → typ ptaka → wiek / masa / FCR / zużycie paszy

---

## 3. PROPOZYCJA DODATKOWYCH TABEL I POLI

### 3.1 Tabela: `bird_groups`
Cel:
- przechowywanie grup indyków z rozróżnieniem małej zdarzeń oraz osobnego modelu dla indora i indyczki

Pola:
- `id`
- `companyId`
- `farmId`
- `houseId`
- `batchId`
- `code`
- `name`
- `sex` (`toms`, `hens`, `mixed`)
- `ageGroup` (`1..8`)
- `dayAge`
- `targetWeightKg`
- `productionGoal`
- `status`
- `createdAt`
- `updatedAt`

Uwaga:
- nie tworzymy nowej wersji stada; tylko rozszerzamy istniejący sens `batches`
- `bird_groups` może być tabelą pomocniczą, ale nie równoległą do `batches`

### 3.2 Tabela: `diet_requirements`
Cel:
- przechowywanie wymagań dla grup 1–8 z rozdzieleniem na indora i indyczkę

Pola:
- `id`
- `companyId`
- `groupCode` / `ageGroup`
- `sex`
- `dayFrom`
- `dayTo`
- `targetWeightKg`
- `energyKcal`
- `proteinPct`
- `lysinePct`
- `methioninePct`
- `threoninePct`
- `calciumPct`
- `phosphorusPct`
- `sodiumPct`
- `extraParams` JSON
- `sourceReference`
- `status`

Uwaga:
- można zamienić tę tabelę na rozszerzenie `nutritional_standards`, nie dodając oddzielnego systemu

### 3.3 Tabela: `recipe_balances`
Cel:
- bilans receptury i statusy parametrów

Pola:
- `id`
- `recipeId`
- `parameterCode`
- `requiredValue`
- `recipeValue`
- `differenceValue`
- `status` (`PASS`, `WARNING`, `DEFICIT`, `EXCESS`)
- `unit`
- `createdAt`

Uwaga:
- nie jest konieczne, aby była osobną tabelą od razu; może być wygenerowana dynamicznie z `recipe_items` i `nutritional_standards`
- w praktyce to obiekt walidacyjny, nie odrębny działający moduł

### 3.4 Tabela: `batch_day_profiles`
Cel:
- śledzenie piskląt w dniach życia

Pola:
- `id`
- `batchId`
- `dayAge`
- `ageGroup`
- `groupCode`
- `targetWeightKg`
- `currentWeightKg`
- `feedRequirementKg`
- `proteinTargetPct`
- `energyTargetKcal`
- `deviationPct`
- `status`
- `createdAt`

Uwaga:
- to jest klucz do wymogu „pisklaki w dniach” bez tworzenia rozłącznie działającego systemu

### 3.5 Tabela: `house_quick_notes`
Cel:
- notatki i szybki wpis do kurnika z datą, godziną, autorem, kategorią i zdjęciami

Pola:
- `id`
- `houseId`
- `batchId`
- `author`
- `category`
- `noteText`
- `eventDate`
- `eventTime`
- `photoUrl`
- `createdAt`

Uwaga:
- można zintegrować z `daily_logs` / `schedule_events`, ale przy dodatkowej kategorii i quick log

### 3.6 Tabela: `litter_events`
Cel:
- ścielenie selektywne z lokalizacją strefy, stanem przed / po i powodem

Pola:
- `id`
- `houseId`
- `sectorId`
- `date`
- `material`
- `quantityKg`
- `areaM2`
- `kgPerM2`
- `reason`
- `beforeStatus`
- `afterStatus`
- `cost`
- `note`
- `createdAt`

Uwaga:
- nie ma potrzeby budować oddzielnego pełnego modułu; można to wydzielić na bazie `litter`

---

## 4. RELACJE, KTÓRE TRZEBA ODTWORZYĆ

### 4.1 RELACJA: firma → fermy → kurniki → partie
- `companies.id` -> `farms.companyId`
- `farms.id` -> `houses.farmId`
- `houses.id` -> `batches.houseId`
- `houses.id` -> `sectors.houseId`
- `batches.id` -> `daily_logs.batchId`
- `batches.id` -> `feed_usages.batchId`
- `batches.id` -> `weighings.batchId`

### 4.2 RELACJA: receptura → składniki → surowce
- `recipes.id` -> `recipe_items.recipeId`
- `feed_ingredients.id` -> `recipe_items.ingredientId`

### 4.3 RELACJA: normy → grupa → płeć → partia
- `nutritional_standards` -> `bird_groups` / `batches`
- `bird_groups` / `batches` -> `recipe_balances`

### 4.4 RELACJA: magazyn → zapasy → zużycie → receptury
- `warehouses.id` / `silos.id` -> `warehouse_stock_items`
- `feed_ingredients.id` -> `material_batches.ingredientId`
- `feed_ingredients.id` -> `warehouse_stock_items.ingredientId`

---

## 5. PROPOZYCJA KONWENCJI NAZW

Aby zachować spójność z istniejącym `schema.ts`, proponuje się:
- `feed_ingredients` zostaje bazową tabelą surowców
- `nutritional_standards` pozostaje bazową tabelą norm żywieniowych
- `recipes` i `recipe_items` pozostają bazowym modelem receptur
- `batches` pozostaje bazowym modelem stada/partii
- dodatkowe tabele rozszerzające business logic mają nazwy:
  - `bird_groups`
  - `diet_requirements`
  - `recipe_balances`
  - `batch_day_profiles`
  - `house_quick_notes`
  - `litter_events`

Ważne:
- nie dodajemy nazw w stylu `bird_flocks_v2` itp. jeśli istnieje już sensowny model w `batches`
- zachowujemy prostotę i zgodność z architekturą

---

## 6. STRATEGIA MIGRACJI BEZ RYZYKA

### ETAP A — bezpieczna expansion
- nie ruszamy istniejących danych
- nie wykonujemy `DROP DATABASE`
- nie zmieniamy MySQL
- dodajemy tylko nowe tabele / pola, o ile nie powodują konfliktu

### ETAP B — znormalizowanie modelu biznesowego
- upewniamy się, że `nutritional_standards` oraz `feed_ingredients` pokrywają podstawę
- wprowadzamy `bird_groups` / `diet_requirements` jako warstwę pomocniczą, a nie równoległą

### ETAP C — walidacja
- przechodzimy przez testy zapisu / odczytu / edycji / usuwania / relacji
- sprawdzamy, że istniejące dane nie są niszczone

---

## 7. ZALECENIE WZGLĘDNE ETAPU 3

Przed dodawaniem seedów należy potwierdzić następujące warunki:
- `feed_ingredients` zawiera listę podstawowych surowców
- `nutritional_standards` ma definicję norm dla grup wiekowych
- `recipes` mogą przechowywać receptury i ich wersje
- `batches` mogą być traktowane jako podstawowe stada w kurniku

Gdy te warunki będą spełnione, można przejść do ETAPU 3 — dane startowe.

---

## 8. PODSUMOWANIE

MODEL DANYCH ETAPU 2 JEST JUŻ WSTĘPNIE ZGODNY Z ISTNIEJĄCYM SCHEMA:
- surowce: `feed_ingredients`
- normy: `nutritional_standards`
- receptury: `recipes` + `recipe_items`
- magazyn: `warehouses` + `silos` + `warehouse_*`
- produkcja: `batches` + `daily_logs` + `feed_usages` + `weighings`

To jest właściwy kierunek rozwoju.

Następny krok nie polega na tworzeniu nowej aplikacji ani równoległego systemu, tylko na uzupełnieniu istniejącego modelu w sposób bezpieczny i spójny z dominującą architekturą projektu.

---

## STATUS KOŃCOWY ETAPU 2 (PLAN)
STATUS: PLAN MODELU DANYCH PRZYGOTOWANY
CO ZROBIONO: architektura rozszerzenia i mapowanie do istniejącego schema
CO DZIAŁA: obecna baza jest kompatybilna z przyszłym rozwojem
CO NIE DZIAŁA: jeszcze nie ma finalnego wdrożenia tabel dodatkowych i relacji produkcyjnych
NASTĘPNY KROK: wdrożenie struktury modelu danych bez ingerencji w działające środowisko
