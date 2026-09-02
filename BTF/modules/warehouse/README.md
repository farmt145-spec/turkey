# 🦃 Bloody Turkey Enterprise — Moduł 5: Warehouse & Logistics Intelligence Engine

Kompletny system magazynowy klasy Enterprise dla profesjonalnej hodowli indyków.

## Architektura

```
turkey-warehouse/
├── schema.prisma              # 25+ modeli PostgreSQL
├── src/
│   ├── modules/
│   │   ├── warehouse/
│   │   │   ├── warehouse.service.ts    # ~900 linii logiki biznesowej
│   │   │   ├── warehouse.controller.ts # 20+ endpointów REST
│   │   │   ├── warehouse.module.ts
│   │   │   └── dto/            # 9 plików DTO ze Swagger
│   │   └── common/
│   │       ├── rbac/           # JWT Guard, Roles Guard, Decorator
│   │       └── audit/          # Audit Log Service + Module
│   └── prisma/
├── frontend/src/components/warehouse/  # 6 komponentów React
├── tests/
│   ├── unit/warehouse.service.spec.ts
│   └── integration/warehouse.controller.e2e-spec.ts
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
└── prisma/seeders/demo-seeder.ts
```

## Funkcjonalności

| # | Moduł | Opis |
|---|-------|------|
| 1 | **Hierarchia magazynów** | Organizacja → Ferma → Magazyn → Silos → Strefa → Regał → Lokalizacja → Partia → Produkt |
| 2 | **Produkty** | 19 kategorii: surowce paszowe, pasze gotowe, premiksy, leki, szczepionki, gaz, ściółka, paliwo... |
| 3 | **Partie (Lots)** | Full traceability: QR, kod kreskowy, certyfikaty, zdjęcia, parametry jakości, mykotoksyny, badania lab. |
| 4 | **Przyjęcia** | PZ, import, produkcja własna, zwroty, transfery, odchowalnia, mieszalnia |
| 5 | **Wydania** | RW, WZ, zużycie paszy/leku/ściółki/gazu, serwis, sprzedaż, utylizacja, korekta |
| 6 | **Transfery** | 1-klik: magazyn→magazyn, silos→silos, ferma→ferma, odchowalnia→kurnik, kurnik→sprzedaż |
| 7 | **AI Warehouse** | Analiza zużycia, tempo pobierania, sezonowość, terminy ważności, zapas bezpieczeństwa |
| 8 | **Prognozy AI** | Kiedy zabraknie, ile zamówić, kiedy zamówić, najlepszy dostawca, najbardziej opłacalny produkt |
| 9 | **Alarmy** | Niski stan, przeterminowanie, wilgotność, mykotoksyny, brak paszy/leku/szczepionki, niezgodność stanów |
| 10 | **Dashboard** | Magazyny, silosy, mapa ferm, produkty, zużycie, koszty, rotacja, prognozy, alarmy |
| 11 | **Integracja żywienie** | FIFO/FEFO, rezerwacje, automatyczne stany, koszt receptury, zamienniki |
| 12 | **Integracja produkcja** | Auto-pobieranie paszy, identyfikowalność od surowca do sprzedaży |
| 13 | **Integracja ekonomika** | Auto-aktualizacja kosztów, marży, EBITDA, ROI, koszt/kg żywca |
| 14 | **AI Knowledge** | Wpływ na FCR, ADG, zdrowie, interakcje, dawkowanie, best practices |
| 15 | **Demo Mode** | 5 ferm, 50 kurników, 10 magazynów, 30 silosów, 500 produktów, 1000 partii, 100 rzutów |

## Quick Start

```bash
# 1. Baza danych
docker-compose -f docker/docker-compose.yml up -d db redis

# 2. Schema + Client
npx prisma migrate dev --name init
npx prisma generate

# 3. Demo data
npx ts-node prisma/seeders/demo-seeder.ts

# 4. Backend
npm run start:dev

# 5. Frontend
cd frontend && npm run dev
```

## API Endpoints (Swagger: /api/docs)

```
POST   /warehouse/products
GET    /warehouse/products
GET    /warehouse/products/:id
POST   /warehouse/lots
GET    /warehouse/lots
POST   /warehouse/lots/traceability
POST   /warehouse/movements
POST   /warehouse/transfers
POST   /warehouse/transfers/execute
GET    /warehouse/transfers
GET    /warehouse/inventory
GET    /warehouse/inventory/by-lot
POST   /warehouse/ai/analyze/:productId
GET    /warehouse/ai/substitutes/:productId
POST   /warehouse/alerts
POST   /warehouse/alerts/resolve
GET    /warehouse/alerts
POST   /warehouse/alerts/scan/:organizationId
GET    /warehouse/dashboard/:organizationId
POST   /warehouse/recipes/reserve
```

## RBAC Roles

- `SUPER_ADMIN` — pełny dostęp
- `ORG_ADMIN` — zarządzanie organizacją
- `FARM_ADMIN` — zarządzanie fermą
- `MANAGER` — decyzje operacyjne
- `OPERATOR` — przyjęcia, wydania, transfery
- `VIEWER` — podgląd
- `AUDITOR` — logi i raporty

## Traceability

Każda partia surowca, paszy, leku i produktu jest śledzona od zakupu do sprzedaży indyków:
```
Dostawca → Partia → Magazyn/Silos → Receptura → Karmienie → Rzut → Sprzedaż
```

## Licencja

Proprietary — Bloody Turkey Enterprise
