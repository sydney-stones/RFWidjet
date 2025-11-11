# Rendered Fits - Production Deployment Guide

Complete guide for deploying Rendered Fits to production using Railway.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start (Railway)](#quick-start-railway)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [CI/CD Setup](#cicd-setup)
- [Monitoring](#monitoring)
- [Cost Estimation](#cost-estimation)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ Railway account (https://railway.app)
- ✅ GitHub account with repo access
- ✅ Google AI Studio API key (for Gemini)
- ✅ AWS account with S3 bucket (for image storage)
- ✅ Shopify Partner account (optional, for Shopify integration)
- ✅ Domain name (optional, for custom domains)

---

## Quick Start (Railway)

### Step 1: Create Railway Project

1. Visit https://railway.app and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select the `RFWidjet` repository
5. Railway will auto-detect the monorepo structure

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provision a PostgreSQL instance
4. Copy the `DATABASE_URL` from the database service

### Step 3: Add Redis Cache (Optional)

1. Click "New" → "Database" → "Redis"
2. Copy the `REDIS_URL` from the Redis service

### Step 4: Configure Services

Railway will create three services automatically:
- **api** (from `packages/api`)
- **dashboard** (from `packages/dashboard`)
- **widget** (from `packages/widget`)

For each service:

1. Click on the service name
2. Go to "Variables" tab
3. Add environment variables (see [Environment Variables](#environment-variables))
4. Set the start command:
   - **API**: `npm run start --workspace=packages/api`
   - **Dashboard**: Uses Nginx (configured in Dockerfile)
   - **Widget**: Uses Nginx (configured in Dockerfile)

### Step 5: Run Database Migrations

1. Click on the **api** service
2. Go to "Settings" → "Deploy"
3. In the deployment logs, find the Railway CLI command
4. Run migrations:
   ```bash
   railway run --service api npx prisma migrate deploy
   ```

### Step 6: Access Your Application

Railway provides public URLs for each service:
- **API**: `https://your-api.up.railway.app`
- **Dashboard**: `https://your-dashboard.up.railway.app`
- **Widget**: `https://your-widget.up.railway.app`

Update your environment variables with the production URLs.

---

## Environment Variables

### API Service (.env)

```bash
# Database (provided by Railway)
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."

# API Configuration
NODE_ENV="production"
PORT="3001"
JWT_SECRET="GENERATE_A_SECURE_32_CHARACTER_STRING"

# Gemini AI (required)
GEMINI_API_KEY="your_gemini_api_key"

# AWS S3 (required)
AWS_ACCESS_KEY_ID="your_aws_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="renderedfits-production"

# Shopify (optional)
SHOPIFY_API_KEY="your_shopify_key"
SHOPIFY_API_SECRET="your_shopify_secret"

# Application URLs (update with Railway URLs)
APP_URL="https://your-api.up.railway.app"
WIDGET_CDN_URL="https://your-widget.up.railway.app/widget.min.js"
CORS_ORIGIN="https://your-dashboard.up.railway.app"

# Optional
SENTRY_DSN="your_sentry_dsn"
```

### Dashboard Service

```bash
VITE_API_URL="https://your-api.up.railway.app"
```

### Widget Service

No environment variables needed (reads API_KEY from merchant integration).

---

## Database Setup

### Initial Migration

After deploying, run the initial migration:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run migrations
railway run --service api npx prisma migrate deploy
```

### Seed Database (Optional)

To add sample data for testing:

```bash
railway run --service api npm run seed
```

### Database Backups

Railway provides automatic daily backups. To create a manual backup:

1. Go to your PostgreSQL service in Railway
2. Click "Backups" tab
3. Click "Create Backup"

---

## CI/CD Setup

### GitHub Actions Configuration

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically:
- Runs tests on pull requests
- Builds Docker images on push to `main`
- Deploys to Railway on successful build

### Required GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

```
RAILWAY_TOKEN=your_railway_token
DOCKER_USERNAME=your_dockerhub_username (optional)
DOCKER_PASSWORD=your_dockerhub_password (optional)
SLACK_WEBHOOK=your_slack_webhook_url (optional)
```

To get your Railway token:
1. Go to https://railway.app/account/tokens
2. Create a new token
3. Copy and add to GitHub secrets

### Manual Deployment

To deploy manually:

```bash
# Deploy all services
railway up

# Deploy specific service
railway up --service api
railway up --service dashboard
railway up --service widget
```

---

## Monitoring

### Railway Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Request logs

Access metrics:
1. Open your service in Railway
2. Click "Metrics" tab

### Error Tracking (Sentry)

1. Create a Sentry account at https://sentry.io
2. Create a new project for "Node.js"
3. Copy your DSN
4. Add `SENTRY_DSN` to Railway environment variables

### Logging

View real-time logs in Railway:
1. Click on any service
2. Click "Deployments" tab
3. Click on the latest deployment
4. View streaming logs

### Health Checks

All services include health check endpoints:
- API: `https://your-api.up.railway.app/health`
- Dashboard: `https://your-dashboard.up.railway.app/health`
- Widget: `https://your-widget.up.railway.app/health`

Set up uptime monitoring with:
- [Uptime Robot](https://uptimerobot.com) (free)
- [Better Uptime](https://betteruptime.com) (paid)
- [Pingdom](https://www.pingdom.com) (paid)

---

## Cost Estimation

### Railway Pricing (£30/month budget)

**Hobby Plan ($5/month):**
- 500 GB-hours of compute
- 100 GB network egress
- Shared CPU
- 512 MB RAM per service

**Developer Plan ($20/month):**
- 5,000 GB-hours of compute
- 1 TB network egress
- Dedicated CPU
- Custom domains
- Priority support

**Recommended for Production: Developer Plan ($20/month)**

### Service Resource Allocation

```
API Service:       8 GB-hours/day × 30 = 240 GB-hours/month
Dashboard:         2 GB-hours/day × 30 = 60 GB-hours/month
Widget:            2 GB-hours/day × 30 = 60 GB-hours/month
PostgreSQL:        4 GB-hours/day × 30 = 120 GB-hours/month
Redis:             2 GB-hours/day × 30 = 60 GB-hours/month
                   ─────────────────────────────────────────
Total:             ~540 GB-hours/month (within Developer Plan limits)
```

### Additional Costs

- **Gemini API**: ~£0.06 per try-on generation
- **AWS S3**: ~$0.023/GB storage + $0.09/GB transfer
- **Sentry**: Free tier (5k errors/month)
- **Domain**: ~$12/year (optional)

**Total Estimated Monthly Cost: ~£25-35**

---

## Troubleshooting

### Deployment Fails

**Issue**: Build fails with "out of memory"
```bash
# Increase memory limit in Railway service settings
Settings → Resources → Memory: 2048 MB
```

**Issue**: Database connection timeout
```bash
# Check DATABASE_URL is correct in environment variables
railway variables

# Test database connection
railway run --service api npx prisma db push
```

### API Not Responding

**Check logs:**
```bash
railway logs --service api
```

**Common issues:**
1. Missing environment variables → Add in Railway UI
2. Database migration pending → Run `prisma migrate deploy`
3. Port mismatch → Ensure PORT=3001 in env vars

### Widget Not Loading

**Check CORS settings:**
- Ensure `CORS_ORIGIN` includes your merchant's domains
- Check widget URL is accessible: `curl https://your-widget.up.railway.app/widget.min.js`

**Verify CDN URL:**
- Update `WIDGET_CDN_URL` in API environment variables
- Restart API service after updating

### Database Performance

**Slow queries:**
```bash
# Add database indexes
railway run --service api npx prisma studio

# Analyze slow queries in Railway PostgreSQL metrics
```

**Connection pool exhausted:**
```bash
# Increase connection pool in DATABASE_URL
DATABASE_URL="postgresql://...?connection_limit=20"
```

### SSL/HTTPS Issues

Railway provides automatic HTTPS. If you're using a custom domain:

1. Add domain in Railway: Settings → Domains → Add Domain
2. Update DNS records (Railway will provide instructions)
3. Wait for SSL certificate provisioning (5-10 minutes)

---

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Health checks returning 200 OK
- [ ] Monitoring setup (Sentry, Uptime Robot)
- [ ] Error tracking working
- [ ] S3 bucket configured with proper CORS
- [ ] Shopify app approved (if using Shopify)
- [ ] Custom domain configured (optional)
- [ ] Backup strategy in place
- [ ] Team access configured in Railway
- [ ] Rate limiting configured
- [ ] HTTPS enabled on all services

---

## Support

- Railway Documentation: https://docs.railway.app
- Rendered Fits Issues: https://github.com/your-repo/issues
- Railway Discord: https://discord.gg/railway
- Email: support@renderedfits.com

---

## Quick Commands Reference

```bash
# Deploy to Railway
railway up

# View logs
railway logs --service api

# Run migrations
railway run --service api npx prisma migrate deploy

# Open Prisma Studio
railway run --service api npx prisma studio

# Connect to database
railway connect postgres

# View environment variables
railway variables

# Rollback deployment
railway rollback

# Scale service
railway scale api --replicas 2
```
