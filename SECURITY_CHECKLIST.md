# 🔒 Security Checklist for Production Deployment

## ⚠️ CRITICAL - Must Complete Before Going Live

### 1. Authentication Middleware (CURRENTLY MISSING!)
- [ ] **URGENT**: Add authentication middleware to ALL API routes
- [ ] Import `authenticateToken` from `/backend/src/middleware/auth.ts`
- [ ] Apply to routes: `/api/factory/*`, `/api/management/*`, `/api/settings/*`, `/api/users/*`, `/api/electricity/*`
- [ ] Test that unauthenticated requests are rejected
- [ ] Verify JWT token validation works correctly

**Example Implementation:**
```typescript
// In each route file (factory.ts, management.ts, etc.)
import { authenticateToken } from '../middleware/auth.js';

async function factoryRoutes(fastify: FastifyInstance) {
  // Apply auth to ALL routes
  fastify.addHook('onRequest', authenticateToken);

  // Your routes here...
}
```

### 2. Environment Variables
- [x] `.env` is in `.gitignore` ✅
- [ ] Generate strong JWT_SECRET (use: `openssl rand -base64 64`)
- [ ] Set `PRODUCTION_FRONTEND_URL` to your exact domain
- [ ] Set `NODE_ENV=production` in production
- [ ] Verify DATABASE_URL uses SSL in production
- [ ] Never commit `.env` file to Git

### 3. CORS Configuration
- [x] Fixed overly permissive CORS ✅
- [ ] Set `PRODUCTION_FRONTEND_URL` environment variable
- [ ] Test CORS blocks unauthorized origins
- [ ] Verify production requests work from your domain

### 4. Password & Secrets
- [x] Passwords hashed with bcrypt ✅
- [x] Removed password logging from auth routes ✅
- [x] JWT secret check added ✅
- [ ] Rotate JWT_SECRET periodically (every 90 days)

### 5. SQL Injection Protection
- [x] Using Prisma ORM (protects against SQL injection) ✅
- [x] No raw SQL queries with user input ✅

### 6. Rate Limiting (RECOMMENDED)
- [ ] Install: `npm install @fastify/rate-limit`
- [ ] Add rate limiting to login endpoint (prevent brute force)
- [ ] Add rate limiting to API endpoints (prevent DoS)

### 7. HTTPS/SSL
- [ ] Ensure production uses HTTPS
- [ ] Redirect HTTP to HTTPS
- [ ] Use HSTS headers
- [ ] Configure SSL certificates (Let's Encrypt or provider)

### 8. Input Validation (RECOMMENDED)
- [ ] Install validation library: `npm install @fastify/schema-json`
- [ ] Add schema validation to all POST/PUT endpoints
- [ ] Sanitize user inputs
- [ ] Validate file uploads (if any)

### 9. Security Headers
- [ ] Install: `npm install @fastify/helmet`
- [ ] Enable security headers (XSS protection, etc.)
- [ ] Set Content-Security-Policy
- [ ] Enable X-Frame-Options

### 10. Logging & Monitoring
- [x] Removed sensitive data logging ✅
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Monitor failed login attempts
- [ ] Log security events
- [ ] Never log passwords, tokens, or API keys

### 11. Database Security
- [ ] Database uses strong password
- [ ] Database only accessible from backend server
- [ ] Enable SSL for database connections
- [ ] Regular database backups
- [ ] Limit database user permissions (principle of least privilege)

### 12. Dependency Security
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Keep dependencies updated
- [ ] Remove unused dependencies
- [ ] Use `npm ci` in production (not `npm install`)

### 13. Error Handling
- [ ] Don't expose stack traces in production
- [ ] Use generic error messages for users
- [ ] Log detailed errors server-side only
- [ ] Handle all async errors

### 14. API Security
- [ ] Implement request size limits
- [ ] Add timeout to API requests
- [ ] Implement pagination for large datasets
- [ ] Protect against NoSQL injection (if using MongoDB)

### 15. Frontend Security
- [ ] Escape user-generated content (XSS protection)
- [ ] Use `httpOnly` cookies for sensitive data
- [ ] Implement CSP (Content Security Policy)
- [ ] Validate all forms client AND server-side

## 🧪 Security Testing

Before going live, test:

1. **Authentication**
   - [ ] Try accessing `/api/factory/calculations` without token (should fail)
   - [ ] Try with invalid token (should fail)
   - [ ] Try with expired token (should fail)
   - [ ] Try with valid token (should work)

2. **CORS**
   - [ ] Request from allowed origin (should work)
   - [ ] Request from disallowed origin (should fail)
   - [ ] Request with no origin in production (should fail)

3. **Authorization**
   - [ ] User can only access their own data
   - [ ] Admin can access all data
   - [ ] Role-based permissions work correctly

4. **Input Validation**
   - [ ] Send malformed JSON (should reject)
   - [ ] Send SQL injection attempts (should be safe)
   - [ ] Send XSS payloads (should be escaped)
   - [ ] Send very large requests (should be limited)

## 📝 Production Deployment Checklist

- [ ] All CRITICAL items above completed
- [ ] Run security scan: `npm audit`
- [ ] Test authentication on staging
- [ ] Backup database before deployment
- [ ] Set all environment variables
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up monitoring/alerts
- [ ] Document incident response plan
- [ ] Have rollback plan ready

## 🚨 If You Get Hacked

1. **Immediate Actions**
   - Take site offline immediately
   - Rotate ALL secrets (JWT_SECRET, database passwords, API keys)
   - Review server logs for suspicious activity
   - Check for unauthorized database changes
   - Notify affected users

2. **Investigation**
   - Identify entry point
   - Check for backdoors
   - Review recent code changes
   - Audit user accounts

3. **Recovery**
   - Patch vulnerability
   - Restore from clean backup
   - Force all users to reset passwords
   - Implement additional security measures
   - Document lessons learned

## 📞 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)
- [Fastify Security](https://www.fastify.io/docs/latest/Guides/Getting-Started/#security)

---

**Last Updated:** $(date)
**Next Security Review:** $(date -d "+30 days")
