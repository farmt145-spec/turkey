# BLOODY TURKEY ENTERPRISE — Moduł IoT & Automatyka Fermy

## Spis treści
1. [Architektura](#architektura)
2. [Stack technologiczny](#stack-technologiczny)
3. [Struktura projektu](#struktura-projektu)
4. [Urządzenia wspierane](#urządzenia-wspierane)
5. [Integracje](#integracje)
6. [Funkcje AI](#funkcje-ai)
7. [Uruchomienie](#uruchomienie)
8. [API](#api)
9. [Testy](#testy)

## Architektura

System oparty na architekturze mikroserwisowej z modułowym backendem NestJS i reaktywnym frontendem React.

## Stack technologiczny

### Backend
- **NestJS** — framework aplikacji
- **Prisma ORM** — dostęp do PostgreSQL
- **Socket.io** — WebSocket real-time
- **TensorFlow.js** — silnik AI/ML
- **Modbus-Serial** — integracja PLC
- **MQTT.js** — broker MQTT
- **node-opcua** — klient OPC-UA
- **Jest** — testy

### Frontend
- **React 18** + TypeScript
- **Vite** — build tool
- **Tailwind CSS** — stylowanie
- **Recharts** — wykresy
- **React Three Fiber** — Digital Twin 3D
- **Zustand** — state management
- **Socket.io-client** — real-time updates

## Urządzenia wspierane

| Kategoria | Urządzenia |
|-----------|-----------|
| Klimat | Sterowniki Fancom, Hotraco, Skov |
| Czujniki | Temperatura, wilgotność, CO₂, NH₃, H₂S, przepływ |
| Media | Liczniki energii, gazu, wody |
| Pasza | Wagi, silosy, automaty paszowe, poidła |
| AI | Kamery AI, wagi ptaków, liczniki padnięć |
| Bezpieczeństwo | Czujniki drzwi, agregaty, UPS, alarmy pożarowe, dezynfekcja |

## Integracje

- **Fancom** — Lumina 21/26/36 (Modbus TCP)
- **Big Dutchman** — ViperTouch, Fortica (REST/Modbus)
- **Hotraco** — Agri (Modbus TCP)
- **Roxell** — SiloTrack (Modbus RTU)
- **Skov** — DOL 539/53 (proprietary/Modbus)
- **Protokoły** — Modbus TCP/RTU, MQTT, OPC-UA, REST API, WebSocket

## Funkcje AI

1. Wykrywanie anomalii
2. Predykcja awarii
3. Predykcja braku paszy
4. Predykcja awarii wentylatorów
5. Anomalia zużycia wody
6. Anomalia zużycia energii
7. Wpływ klimatu na FCR
8. Wpływ klimatu na śmiertelność
9. Wpływ klimatu na ADG
10. Zalecenia dla obsługi

## Uruchomienie

### Wymagania
- Node.js >= 20
- Docker >= 24
- PostgreSQL >= 16 (lub Docker)

### Szybki start

```bash
git clone <repo> && cd bloody-turkey-iot
make docker-up
make install
make db-migrate
make db-seed
make dev
```

### Dostęp po uruchomieniu

| Usługa | URL |
|--------|-----|
| Aplikacja web | http://localhost:3000 |
| API | http://localhost:4000 |
| Swagger Docs | http://localhost:4000/docs |
| Prisma Studio | http://localhost:5555 |
| Grafana | http://localhost:3001 |

### Logowanie (dane seed)

- **Email:** `admin@bloodyturkey.com`
- **Hasło:** `admin123`

## API

Pełna dokumentacja API dostępna pod `/docs` (Swagger OpenAPI 3.0).

## Testy

```bash
make test
make test:e2e
```

## Licencja

Proprietary — Bloody Turkey Enterprise Systems © 2026
