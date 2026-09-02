# Turkey Health Intelligence Engine

Enterprise Veterinary Decision Support System for Turkey Production.

## Stack
- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Tailwind CSS + TanStack Query
- **AI**: Rule-based inference engine (replaceable with TensorFlow/PyTorch model)

## Quick Start

```bash
# 1. Clone and setup
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL and JWT_SECRET

# 2. Docker
docker-compose up -d --build

# 3. Access
# API: http://localhost:3000/api
# Swagger: http://localhost:3000/api/docs
# Frontend: http://localhost
```

## Modules
1. Health Records (full CRUD with images/PDF)
2. AI Disease Advisor (symptom analysis with veterinarian disclaimer)
3. AI Early Disease Detection (FCR/ADG/anomaly detection)
4. Vaccination Calendar
5. Treatment Manager
6. Withdrawal Control
7. Disease Library
8. Risk Score Engine
9. Health Dashboard with Farm Map
10. Audit Log & RBAC

## License
Proprietary - Industrial Turkey Production Systems
