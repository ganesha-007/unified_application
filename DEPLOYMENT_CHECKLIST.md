# Deployment Checklist

Use this checklist to ensure everything is ready for deployment.

## Pre-Deployment

### Backend Setup

- [ ] All dependencies installed (`npm install`)
- [ ] Environment variables configured (`.env` file)
- [ ] Database created and migrations run
- [ ] PostgreSQL is running and accessible
- [ ] UniPile API key is valid and active
- [ ] JWT secret is set to a secure random value
- [ ] CORS origin is configured correctly

### Frontend Setup

- [ ] All dependencies installed (`npm install`)
- [ ] Environment variables configured (`.env` file)
- [ ] API URL points to correct backend
- [ ] Build completes without errors (`npm run build`)

### Testing

- [ ] Backend starts successfully (`npm run dev`)
- [ ] Frontend starts successfully (`npm start`)
- [ ] Can login with test credentials
- [ ] Can connect a WhatsApp account
- [ ] Can view chats in inbox
- [ ] Can send messages
- [ ] Database persists data correctly
- [ ] Socket.io connection works

## Webhook Configuration

### Setup

- [ ] Backend is publicly accessible (ngrok or production)
- [ ] Webhook URL is HTTPS (production)
- [ ] Webhook URL is accessible from internet
- [ ] UniPile webhook configured for `message.new`
- [ ] UniPile webhook configured for `account.update`
- [ ] Webhook signature verification implemented (optional)
- [ ] Webhook secret configured in environment

### Testing

- [ ] Send test message via WhatsApp
- [ ] Message appears in inbox within seconds
- [ ] Account status updates work correctly
- [ ] Webhook logs show successful delivery
- [ ] No errors in backend logs

## Security

- [ ] All secrets in environment variables (not in code)
- [ ] JWT secret is strong and unique
- [ ] CORS is properly configured
- [ ] HTTPS enabled (production)
- [ ] Database credentials are secure
- [ ] Webhook signature verification enabled (recommended)
- [ ] Rate limiting implemented (optional)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)

## Performance

- [ ] Database indexes created
- [ ] Connection pooling configured
- [ ] Gzip compression enabled
- [ ] Static assets optimized
- [ ] Frontend code splitting enabled
- [ ] CDN configured (optional)
- [ ] Load testing completed

## Monitoring

- [ ] Health check endpoint working (`/health`)
- [ ] Logging configured
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Database monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Alerts configured for critical errors

## Documentation

- [ ] README.md is complete
- [ ] API documentation is up to date
- [ ] Environment variables documented
- [ ] Deployment instructions written
- [ ] Troubleshooting guide created
- [ ] Postman collection exported

## Production Deployment

### Option 1: Docker

- [ ] Dockerfile builds successfully
- [ ] Docker Compose file configured
- [ ] Environment variables in docker-compose.yml
- [ ] Volumes configured for persistence
- [ ] Network configuration correct
- [ ] Containers start successfully
- [ ] Health checks pass

### Option 2: Cloud Platform

#### Heroku

- [ ] Heroku CLI installed
- [ ] Heroku app created
- [ ] PostgreSQL addon added
- [ ] Environment variables set in Heroku
- [ ] Buildpacks configured
- [ ] App deployed successfully
- [ ] Database migrations run
- [ ] Custom domain configured (optional)

#### AWS

- [ ] EC2 instance or Elastic Beanstalk configured
- [ ] RDS PostgreSQL instance created
- [ ] Security groups configured
- [ ] IAM roles configured
- [ ] Environment variables set
- [ ] Application deployed
- [ ] Database migrations run
- [ ] Load balancer configured (optional)

#### DigitalOcean

- [ ] Droplet or App Platform configured
- [ ] Managed PostgreSQL database created
- [ ] Environment variables set
- [ ] Application deployed
- [ ] Database migrations run
- [ ] SSL certificate configured

### Option 3: VPS

- [ ] Server provisioned
- [ ] Node.js installed
- [ ] PostgreSQL installed
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] PM2 or similar process manager installed
- [ ] Application deployed
- [ ] Database migrations run
- [ ] Firewall configured

## Post-Deployment

- [ ] Application is accessible via public URL
- [ ] Frontend loads successfully
- [ ] Backend API responds correctly
- [ ] Database connection works
- [ ] Webhooks are receiving events
- [ ] Real-time messaging works
- [ ] No errors in logs
- [ ] Performance is acceptable
- [ ] SSL certificate is valid
- [ ] Custom domain works (if applicable)

## Verification Tests

### Manual Testing

- [ ] Login with test credentials
- [ ] Connect WhatsApp account
- [ ] View conversations in inbox
- [ ] Send a message
- [ ] Receive a message (via webhook)
- [ ] Real-time updates work
- [ ] Logout works
- [ ] Error handling works

### API Testing

- [ ] All endpoints return correct responses
- [ ] Authentication works
- [ ] Entitlement checks work
- [ ] Error responses are correct
- [ ] Webhooks process correctly

### Database Testing

- [ ] Data persists correctly
- [ ] Queries are optimized
- [ ] No connection leaks
- [ ] Migrations applied correctly

## Rollback Plan

- [ ] Previous version backed up
- [ ] Database backup created
- [ ] Rollback procedure documented
- [ ] Rollback tested in staging

## Go-Live

- [ ] All checklist items completed
- [ ] Stakeholders notified
- [ ] Monitoring alerts configured
- [ ] Support team briefed
- [ ] Documentation shared
- [ ] Backup and recovery tested
- [ ] Performance benchmarks met
- [ ] Security audit passed

## Post-Launch

### First 24 Hours

- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify webhook delivery
- [ ] Test critical paths
- [ ] Address any issues immediately

### First Week

- [ ] Review usage patterns
- [ ] Optimize slow queries
- [ ] Tune performance
- [ ] Gather user feedback
- [ ] Plan improvements

## Maintenance

### Regular Tasks

- [ ] Database backups automated
- [ ] Log rotation configured
- [ ] Security patches applied
- [ ] Dependencies updated
- [ ] Performance monitoring active
- [ ] Error tracking active

---

## Quick Deployment Commands

### Local Development

```bash
# Backend
cd backend
npm install
npm run migrate
npm run dev

# Frontend
cd frontend
npm install
npm start
```

### Docker Deployment

```bash
docker-compose up -d
```

### Heroku Deployment

```bash
# Backend
cd backend
heroku create your-app-name
heroku addons:create heroku-postgresql
git push heroku main
heroku run npm run migrate

# Frontend
cd frontend
heroku create your-frontend-name
git push heroku main
```

### Manual Deployment

```bash
# Build
cd backend && npm run build
cd ../frontend && npm run build

# Run
cd backend && npm start
# Serve frontend build with Nginx
```

---

**Checklist completed? You're ready to deploy! 🚀**

