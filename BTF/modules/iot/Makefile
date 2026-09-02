.PHONY: help install dev build test docker-up docker-down db-migrate db-seed

help:
	@echo "Bloody Turkey IoT - Komendy dostępne:"
	@echo "  make install      - Instalacja zależności"
	@echo "  make dev          - Uruchomienie środowiska deweloperskiego"
	@echo "  make build        - Budowa produkcyjna"
	@echo "  make test         - Uruchomienie testów"
	@echo "  make test:e2e     - Uruchomienie testów E2E"
	@echo "  make docker-up    - Uruchomienie infrastruktury Docker"
	@echo "  make docker-down  - Zatrzymanie infrastruktury Docker"
	@echo "  make db-migrate   - Migracja bazy danych"
	@echo "  make db-seed      - Seedowanie danych testowych"
	@echo "  make db-studio    - Prisma Studio"
	@echo "  make lint         - Lintowanie kodu"

install:
	npm install
	cd apps/api && npm install
	cd apps/web && npm install

dev:
	@make docker-up
	@sleep 5
	@make db-migrate
	@cd apps/api && npm run start:dev & 	cd apps/web && npm run dev

build:
	cd apps/api && npm run build
	cd apps/web && npm run build

test:
	cd apps/api && npm run test
	cd apps/web && npm run test

test:e2e:
	cd apps/api && npm run test:e2e

docker-up:
	cd docker && docker-compose up -d postgres redis mosquitto

docker-down:
	cd docker && docker-compose down

docker-build:
	cd docker && docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

db-migrate:
	cd apps/api && npx prisma migrate dev

db-seed:
	cd apps/api && npx prisma db seed

db-studio:
	cd apps/api && npx prisma studio

lint:
	cd apps/api && npm run lint
	cd apps/web && npm run lint

format:
	npx prettier --write "apps/**/*.{ts,tsx,js,json,md}"
