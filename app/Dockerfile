# BTE HYBRID — all-in-one PREVIEW image
# Frontend (Vite dev) + Hono/tRPC API + embedded MySQL 8.0.45 + demo data.
# Dev mode => /api/dev-login enabled (demo session without Kimi OAuth).
FROM node:20-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends libaio1 xz-utils curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# MySQL 8.0.45 (official binary tarball, glibc build)
RUN curl -fsSL "https://cdn.mysql.com/archives/mysql-8.0/mysql-8.0.45-linux-glibc2.28-x86_64.tar.xz" -o /tmp/mysql.tar.xz \
 && mkdir -p /opt/mysql \
 && tar xJf /tmp/mysql.tar.xz -C /opt/mysql --strip-components=1 \
 && rm /tmp/mysql.tar.xz

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund
COPY . .
# env ładowane z wersjonowanego .env.preview (fallback w api/lib/env.ts)
RUN mkdir -p /data/uploads /data/mysql /data/run /data/log

EXPOSE 3000
CMD ["bash", "docker-preview/start.sh"]
