# Railway Deployment - Quick Reference

One-click deployment guide for Railway.

## 🚂 Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/rendered-fits)

## Setup Steps

### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link services
railway link
```

### 2. Add Services

**Required Services:**
- PostgreSQL (Database)
- Redis (Cache)
- API (packages/api)
- Dashboard (packages/dashboard)
- Widget (packages/widget)

**Add from Railway UI:**
1. Click "New"
2. Select "Database" → "PostgreSQL"
3. Repeat for Redis
4. Services auto-detected from monorepo

### 3. Environment Variables

**API Service:**
```bash
railway variables set \
  NODE_ENV=production \
  PORT=3001 \
  JWT_SECRET="your-secret-32-chars" \
  GEMINI_API_KEY="your-key" \
  AWS_ACCESS_KEY_ID="your-key" \
  AWS_SECRET_ACCESS_KEY="your-secret" \
  S3_BUCKET_NAME="your-bucket" \
  --service api
```

**Dashboard Service:**
```bash
railway variables set \
  VITE_API_URL="https://your-api.up.railway.app" \
  --service dashboard
```

### 4. Deploy

```bash
# Deploy all services
railway up

# Or deploy individually
railway up --service api
railway up --service dashboard
railway up --service widget
```

### 5. Run Migrations

```bash
railway run --service api npx prisma migrate deploy
```

## Service Configuration

### API Service

**Build Command:** `npm run build --workspace=packages/api`
**Start Command:** `npm run start --workspace=packages/api`
**Health Check:** `/health`

### Dashboard Service

**Build Command:** `npm run build --workspace=packages/dashboard`
Uses Nginx (configured in Dockerfile)
**Health Check:** `/health`

### Widget Service

**Build Command:** `npm run build --workspace=packages/widget`
Uses Nginx (configured in Dockerfile)
**Health Check:** `/health`

## Custom Domain Setup

1. Railway Dashboard → Service → Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `api.renderedfits.com`)
4. Update DNS records:
   ```
   Type: CNAME
   Name: api
   Value: your-service.up.railway.app
   ```
5. Wait for SSL certificate (5-10 minutes)

## Database Backups

**Automatic:** Daily backups enabled by default

**Manual Backup:**
```bash
# Create backup
railway pg backup create

# List backups
railway pg backup list

# Restore backup
railway pg backup restore <backup-id>
```

## Monitoring

**View Logs:**
```bash
railway logs --service api
railway logs --service dashboard
railway logs --service widget
```

**Metrics:**
- CPU/Memory usage: Railway Dashboard → Service → Metrics
- Request logs: Railway Dashboard → Service → Deployments → Logs

## Scaling

```bash
# Scale up
railway scale api --replicas 2

# Scale down
railway scale api --replicas 1
```

## Cost Optimization

**Hobby Plan ($5/month):**
- Good for testing/staging
- 500 GB-hours compute
- Shared resources

**Developer Plan ($20/month):**
- Recommended for production
- 5,000 GB-hours compute
- Dedicated resources
- Custom domains

**Resource Allocation:**
```
API:        1 GB RAM × 24h = 24 GB-hours/day
Dashboard:  512 MB RAM × 24h = 12 GB-hours/day
Widget:     512 MB RAM × 24h = 12 GB-hours/day
PostgreSQL: 1 GB RAM × 24h = 24 GB-hours/day
Redis:      512 MB RAM × 24h = 12 GB-hours/day
            ─────────────────────────────────
Total:      ~84 GB-hours/day = 2,520 GB-hours/month
```

Within Developer Plan limits ✅

## Troubleshooting

**Service won't start:**
```bash
# Check logs
railway logs --service api --tail

# Restart service
railway restart api
```

**Database connection issues:**
```bash
# Test connection
railway run --service api npx prisma db push

# Check DATABASE_URL
railway variables --service api | grep DATABASE_URL
```

**Out of memory:**
```bash
# Increase memory in Railway UI
Settings → Resources → Memory: 2048 MB
```

## Quick Commands

```bash
# Status
railway status

# Environment variables
railway variables

# Connect to database
railway connect postgres

# Run command
railway run --service api npm run seed

# Rollback
railway rollback

# Delete service
railway service delete api
```

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: https://github.com/your-repo/issues
