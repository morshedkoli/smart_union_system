# 🚀 Production Deployment Guide

## Quick Start

### 1. Environment Setup

Copy the environment template and configure:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your production values:

```env
# Required
MONGODB_URI=mongodb://your-mongodb-uri
JWT_SECRET=your-256-bit-secret-min-32-characters-long
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional but recommended
REDIS_URL=redis://localhost:6379
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Application

```bash
npm run build
```

### 4. Start Production Server

```bash
npm start
```

---

## 📋 Pre-Deployment Checklist

### Security
- [ ] JWT_SECRET is strong (min 32 chars, random)
- [ ] NODE_ENV=production
- [ ] All API endpoints have rate limiting
- [ ] HTTPS enabled
- [ ] Security headers configured

### Database
- [ ] MongoDB connection string is correct
- [ ] Database user has appropriate permissions
- [ ] Backup strategy configured
- [ ] Indexes are created (automatic on first run)

### Application
- [ ] NEXT_PUBLIC_APP_URL is correct
- [ ] All environment variables are set
- [ ] Application builds without errors
- [ ] All services start correctly

### Monitoring
- [ ] Health check endpoint working: GET /api/health
- [ ] Log aggregation configured
- [ ] Error tracking setup (Sentry, etc.)

---

## 🔧 Advanced Configuration

### Rate Limiting with Redis

For multi-server deployments, use Redis:

```bash
npm install ioredis
```

Update `src/lib/rate-limit.ts` to use Redis instead of in-memory store.

### MongoDB Connection Pool

Configure connection pooling in `src/lib/mongodb.ts`:

```typescript
const opts = {
  bufferCommands: false,
  maxPoolSize: 10,        // Increase for high traffic
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};
```

### PM2 Configuration

For production process management:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'smart-union',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 'max',      // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G'
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/smart_union
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongo
      - redis
    restart: always

  mongo:
    image: mongo:6
    volumes:
      - mongo-data:/data/db
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

volumes:
  mongo-data:
```

Run:
```bash
docker-compose up -d
```

---

## 🔒 Security Hardening

### 1. MongoDB Security

Enable authentication:
```javascript
// In MongoDB shell
use admin
db.createUser({
  user: "admin",
  pwd: "strong-password",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})
```

Update connection string:
```
mongodb://admin:password@localhost:27017/smart_union?authSource=admin
```

### 2. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 📊 Monitoring

### Health Check Endpoint

Add to `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: "unhealthy", error: "Database connection failed" },
      { status: 503 }
    );
  }
}
```

### Log Aggregation

Install Winston:
```bash
npm install winston
```

Create `src/lib/logger.ts`:
```typescript
import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

---

## 🔄 Backup Strategy

### MongoDB Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"

mkdir -p $BACKUP_DIR

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$DATE"

# Keep only last 7 daysind $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

# Upload to cloud storage (optional)
# aws s3 sync $BACKUP_DIR/$DATE s3://your-bucket/backups/$DATE
```

Add to crontab:
```bash
0 2 * * * /path/to/backup.sh
```

---

## 🆘 Troubleshooting

### Issue: Application won't start
- Check environment variables are set
- Verify MongoDB is running and accessible
- Check logs: `npm start 2>&1 | tee app.log`

### Issue: Database connection errors
- Verify MONGODB_URI is correct
- Check MongoDB is running: `sudo systemctl status mongod`
- Test connection: `mongosh "$MONGODB_URI"`

### Issue: Rate limiting too strict
- Adjust limits in `src/lib/rate-limit.ts`
- Clear rate limit store (restart application)

### Issue: High memory usage
- Reduce maxPoolSize in MongoDB connection
- Implement caching with Redis
- Add memory monitoring

---

## 📞 Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review audit logs in MongoDB
3. Check application health: `GET /api/health`
4. Review error tracking (Sentry)

---

## ✅ Post-Deployment Verification

Run these checks after deployment:

```bash
# 1. Health check
curl https://your-domain.com/api/health

# 2. Test login endpoint with rate limiting
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# 3. Verify audit logging
mongosh "$MONGODB_URI" --eval "db.auditlogs.countDocuments()"

# 4. Check database indexes
mongosh "$MONGODB_URI" --eval "db.citizens.getIndexes()"

# 5. Verify SSL certificate
curl -vI https://your-domain.com 2>&1 | grep "SSL connection"
```

---

**Your Smart Union Parishad Management System is now production-ready!** 🎉
