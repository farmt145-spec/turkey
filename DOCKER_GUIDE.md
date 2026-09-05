# 🐳 Docker & Containerization Guide

## Overview

This project includes Docker configuration for:
- **Production deployments** on Railway
- **Local development** with Docker Compose
- **Consistent environments** across machines

---

## Files

- **`Dockerfile`** - Production image (repo root)
- **`app/Dockerfile`** - App-specific image
- **`docker-compose.yml`** - Local dev setup with MySQL
- **`.dockerignore`** - Optimized build context
- **`railway.json`** - Railway-specific configuration

---

## Quick Start with Docker Compose

### Prerequisites

```bash
# Install Docker
# macOS: https://www.docker.com/products/docker-desktop
# Ubuntu: sudo apt-get install docker.io docker-compose
# Windows: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

### Run Locally

```bash
# Start all services (MySQL + App)
docker-compose up -d

# View logs
docker-compose logs -f app

# Access application
open http://localhost:3000

# Stop services
docker-compose down

# Clean up (remove data)
docker-compose down -v
```

### Environment Variables

Edit `docker-compose.yml` to change:
- Database password
- Node environment
- Demo mode settings

---

## Production Docker Image

### Build Image

```bash
docker build -t turkey:latest -f app/Dockerfile app/

# Or with Railway CLI
railway run docker build -t turkey:latest -f app/Dockerfile .
```

### Push to Railway

```bash
# Railway handles Docker automatically
# Just push code to GitHub, Railway builds from Dockerfile
```

### Test Locally

```bash
docker run -it \
  -e DATABASE_URL="mysql://user:pass@host:3306/db" \
  -e SESSION_SECRET="your-secret" \
  -e API_KEY_PEPPER="your-pepper" \
  -p 3000:3000 \
  turkey:latest
```

---

## Docker Compose Services

### MySQL Service

```yaml
mysql:
  image: mysql:8.0
  ports: 3306:3306
  volumes: mysql_data:/var/lib/mysql
```

**Access:**
```bash
docker exec -it turkey_mysql mysql -u turkey_user -p turkey_db
```

### App Service

```yaml
app:
  build: app/Dockerfile
  ports: 3000:3000
  depends_on: mysql (waits for health check)
```

---

## Common Docker Commands

```bash
# Build image
docker build -t turkey:latest .

# Run container
docker run -p 3000:3000 turkey:latest

# View running containers
docker ps

# View all containers
docker ps -a

# View logs
docker logs <container_id>

# Stop container
docker stop <container_id>

# Remove container
docker rm <container_id>

# Remove image
docker rmi turkey:latest

# Docker Compose
docker-compose up              # Start
docker-compose down            # Stop
docker-compose logs -f         # Watch logs
docker-compose ps              # View services
docker-compose restart         # Restart
docker-compose exec app bash   # Shell into container
```

---

## Railway Deployment with Docker

### Prerequisites

- Docker image pushed to registry, OR
- Dockerfile in repository (Railway uses this)

### Railway Configuration

Railway automatically:
1. Detects `Dockerfile` in repo
2. Builds Docker image
3. Runs container with env variables
4. Scales and manages

### Environment Variables

Add in Railway dashboard:
```
DATABASE_TYPE=mysql
DATABASE_URL=mysql://...
NODE_ENV=production
SESSION_SECRET=...
API_KEY_PEPPER=...
```

### Deployment

```bash
# Push code to GitHub
git push origin main

# Railway automatically:
# 1. Builds Docker image
# 2. Runs container
# 3. Connects to MySQL service
# 4. Makes application live
```

---

## Optimization Tips

### Build Performance

1. **Multi-stage builds** - Reduce image size
2. **Layer caching** - Keep dependencies stable
3. **.dockerignore** - Exclude unnecessary files

### Runtime Performance

1. **Alpine base image** - Smaller, faster
2. **Health checks** - Railway monitors container
3. **Resource limits** - Set in docker-compose

### Security

1. **Non-root user** - Don't run as root
2. **Secrets management** - Use env variables
3. **Minimal dependencies** - Reduce attack surface

---

## Troubleshooting

### "Cannot connect to database"

```bash
# Check if MySQL is running
docker-compose ps

# View logs
docker-compose logs mysql

# Restart services
docker-compose restart
```

### "Port already in use"

```bash
# Change ports in docker-compose.yml
ports:
  - "3307:3306"  # Changed from 3306
  - "3001:3000"  # Changed from 3000
```

### "Build fails"

```bash
# Check Node version
docker build -t test -f app/Dockerfile . --build-arg NODE_VERSION=18

# View detailed logs
docker build -t test -f app/Dockerfile . --progress=plain
```

### "Out of disk space"

```bash
# Clean up Docker
docker system prune -a

# Remove volumes
docker volume prune
```

---

## Production Checklist

- [ ] Dockerfile tested locally
- [ ] All env variables configured
- [ ] Health checks passing
- [ ] Container logs reviewed
- [ ] Database connection verified
- [ ] Application responding to requests
- [ ] Build completes within 10 minutes

---

## Resources

- 📖 [Docker Documentation](https://docs.docker.com/)
- 🐳 [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- 🚂 [Railway + Docker](https://docs.railway.app/deploy/dockerfiles)
- 🔧 [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)

---

**Docker makes deployment consistent, repeatable, and safe!** 🎯
