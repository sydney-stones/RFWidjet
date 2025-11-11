# Production Readiness Checklist

Ensure all items are checked before going live.

## 🔐 Security

- [ ] All environment variables use production values (not dev/test)
- [ ] `JWT_SECRET` is a cryptographically secure random string (32+ chars)
- [ ] Database credentials are strong and unique
- [ ] `NODE_ENV=production` set in all services
- [ ] CORS origins restricted to production domains only
- [ ] Rate limiting enabled and configured appropriately
- [ ] Helmet security headers configured in API
- [ ] HTTPS enabled on all services (Railway provides automatically)
- [ ] Shopify webhook HMAC verification enabled
- [ ] API keys regenerated from development values
- [ ] S3 bucket has proper IAM permissions (not public)
- [ ] Database connection string does not expose password in logs

## 📊 Database

- [ ] All Prisma migrations applied: `npx prisma migrate deploy`
- [ ] Database indexes added for frequently queried fields
- [ ] Connection pooling configured appropriately
- [ ] Automatic backups enabled (Railway default: daily)
- [ ] Manual backup tested and verified
- [ ] Database monitoring alerts set up
- [ ] Query performance tested under load
- [ ] Foreign key constraints enabled
- [ ] Database timezone set correctly (UTC recommended)

## 🧪 Testing

- [ ] All unit tests passing: `npm test`
- [ ] Integration tests passing
- [ ] End-to-end tests passing (if applicable)
- [ ] Load testing completed (recommended: k6 or Artillery)
- [ ] API endpoints tested with production-like data
- [ ] Widget tested on sample e-commerce site
- [ ] Dashboard tested in production build
- [ ] Mobile responsiveness verified
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari, Edge)

## 🚀 Deployment

- [ ] All services deployed to Railway
- [ ] Health checks returning 200 OK:
  - API: `/health`
  - Dashboard: `/health`
  - Widget: `/health`
- [ ] Service replicas configured (start with 1, scale as needed)
- [ ] Auto-restart policies configured
- [ ] Deployment rollback tested
- [ ] Zero-downtime deployment verified
- [ ] Docker images building successfully
- [ ] GitHub Actions CI/CD pipeline working

## 📡 Monitoring & Logging

- [ ] Sentry error tracking configured and tested
- [ ] Log aggregation set up (Railway logs or external service)
- [ ] Uptime monitoring configured (UptimeRobot, BetterUptime, etc.)
- [ ] Performance monitoring enabled (APM)
- [ ] Alert notifications set up (email, Slack, PagerDuty)
- [ ] Dashboard metrics displaying correctly
- [ ] Error rate alerts configured (<1% recommended)
- [ ] Response time alerts configured (<500ms recommended)
- [ ] Database connection pool monitoring
- [ ] Memory and CPU usage alerts

## 💰 Cost Management

- [ ] Railway plan selected (Developer Plan recommended: $20/month)
- [ ] Resource limits configured per service
- [ ] Gemini API usage monitoring enabled
- [ ] AWS S3 costs estimated and budget alerts set
- [ ] Billing alerts configured in Railway
- [ ] Cost optimization reviewed (right-size resources)
- [ ] Usage metrics tracked in dashboard

## 🌐 Infrastructure

- [ ] Custom domain configured (optional)
- [ ] DNS records verified and propagating
- [ ] SSL certificates issued and valid
- [ ] CDN configured for static assets (optional)
- [ ] Redis cache warmed up (if using)
- [ ] Image optimization pipeline tested
- [ ] Webhook endpoints publicly accessible
- [ ] CORS headers properly configured for widget

## 📱 Integration

- [ ] Shopify app approved and published (if using)
- [ ] OAuth flow tested end-to-end
- [ ] Webhook handlers verified with test data
- [ ] Product sync working correctly
- [ ] Conversion tracking tested
- [ ] Widget rendering on merchant sites
- [ ] API key authentication working
- [ ] WooCommerce/Magento webhook formats tested (if supporting)

## 📚 Documentation

- [ ] API documentation up to date
- [ ] Widget integration guide available
- [ ] Merchant onboarding flow documented
- [ ] Support contact information visible
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance documented (if serving EU customers)
- [ ] Changelog maintained

## 🔄 Operational

- [ ] Incident response plan documented
- [ ] On-call rotation established (if applicable)
- [ ] Backup and recovery procedures tested
- [ ] Database migration rollback plan prepared
- [ ] Service degradation communication plan ready
- [ ] Status page set up (statuspage.io, etc.)
- [ ] Customer support channels established
- [ ] Escalation procedures documented

## ✅ Final Checks

- [ ] All team members have Railway access
- [ ] GitHub repository access configured
- [ ] Passwords stored in password manager
- [ ] Environment variables backed up securely
- [ ] Emergency contact list prepared
- [ ] Post-launch monitoring scheduled (24h, 1 week, 1 month)
- [ ] Customer feedback collection set up
- [ ] Analytics tracking verified
- [ ] Performance benchmarks recorded for future comparison

---

## Launch Day Protocol

### 1 Hour Before Launch
- [ ] Verify all health checks green
- [ ] Check error rates (should be 0%)
- [ ] Verify database connections
- [ ] Test critical user flows
- [ ] Alert team members

### At Launch
- [ ] Enable production traffic
- [ ] Monitor logs in real-time
- [ ] Watch error tracking dashboard
- [ ] Check response times
- [ ] Verify widget loading on test merchant site

### 1 Hour After Launch
- [ ] Review error rates
- [ ] Check performance metrics
- [ ] Verify conversions tracking
- [ ] Review customer feedback
- [ ] Document any issues

### 24 Hours After Launch
- [ ] Analyze metrics trends
- [ ] Review database performance
- [ ] Check cost against estimates
- [ ] Survey early customers
- [ ] Plan iteration improvements

---

## Emergency Contacts

```
Railway Support:   https://railway.app/support
Gemini API Status: https://status.cloud.google.com
AWS Status:        https://status.aws.amazon.com
GitHub Status:     https://www.githubstatus.com
```

## Rollback Procedure

If critical issues arise:

```bash
# 1. Identify the working deployment
railway deployments list --service api

# 2. Rollback to previous version
railway rollback --service api --deployment <deployment-id>

# 3. Verify rollback successful
railway logs --service api --tail

# 4. Notify stakeholders
```

---

**Sign-off:**

- [ ] Technical Lead: _________________ Date: _______
- [ ] Product Owner: _________________ Date: _______
- [ ] DevOps Lead: __________________ Date: _______

**Production Go-Live Approved:** ☐ YES ☐ NO

**Launch Date:** ___________________
