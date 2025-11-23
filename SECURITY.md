# The Dough House - Security Architecture

## Overview

The Dough House implements enterprise-grade security across all layers: authentication, authorization, data protection, and audit logging.

## 1. Authentication

### NextAuth Configuration

- **Strategy**: JWT with credential-based login
- **Session Storage**: Supabase database (User, Session tables)
- **Token Expiration**: 24 hours
- **Secret**: Environment variable (NEXTAUTH_SECRET)

### Password Security

- **Hashing**: bcryptjs with 10 salt rounds
- **Storage**: Hashed passwords only in database
- **Transmission**: HTTPS/TLS only (enforced in production)
- **Minimum Requirements**: 6+ characters (per spec; recommend 12+ in production)

### Session Management

```typescript
// Session creation
const session = await createUserSession(user, issuedAt, expiresAt);

// Session validation
const valid = await validateSession(token);

// Automatic expiration: 24 hours
// Refresh: Next login required (no silent refresh)
```

### User Activation (Staged Hiring)

- New users created with `isActive: false`
- Admin must explicitly activate user before login allowed
- Prevents unauthorized access to terminated employees

## 2. Authorization (RBAC)

### Role-Based Access Control

**15 Roles** with granular permissions across 19 modules:

1. **Owner/Super Admin**: Full access to all modules
2. **General Manager**: View/manage all operations except settings
3. **Warehouse Lead**: Warehouse, Inventory, Orders (partial)
4. **Marketing Manager**: Marketing, Campaigns, Events
5. **Logistics Coordinator**: Warehouse, Shipments, Orders (partial)
6. **QA/Food Safety Officer**: Production, QC, Checklists
7. **Finance/Accountant**: Finance, Invoices, Reports
8. **Customer Support**: Orders, CRM, Customers
9. **HR/People Operations**: HR, Employees, Attendance
10. **Store Manager**: Orders, Customers, Employees (location-specific)
11. **Procurement/Buyer**: Inventory, Purchases
12. **Production Manager**: Production, Batches, QC
13. **Packers/Warehouse Staff**: Pick Lists, Pack Jobs (partial)
14. **Kitchen Assistants/Cooks**: Production, Checklists (partial)
15. **POS Operator**: Orders, Customers (in-store only)

### Permission Types

- **Yes**: Full access (view, create, update, delete)
- **Partial**: Limited access (view, execute only; no create/update/delete)
- **No**: No access

### Org & Location Scoping

```typescript
// Permission check with org/location context
const hasPermission = await hasPermission(
  userId,
  'orders.create',
  organizationId,
  locationId // optional for location-specific roles
);

// Returns false if:
// - User not in organization
// - User's role doesn't have permission
// - Location-scoped role assigned to different location
```

### API Permission Enforcement

```typescript
// Every API route checks permissions
const hasAccess = await hasPermission(userId, 'orders.view', orgId);
if (!hasAccess) {
  throw new ForbiddenError('You do not have permission to view orders');
}
```

## 3. Database Security

### Row-Level Security (RLS)

All 60+ tables have RLS policies enforced at database level:

```sql
-- Organization-scoped access
CREATE POLICY "Users can only access their organization data" ON "Order"
  USING (organization_id = current_user_org_id());

-- Location-scoped access
CREATE POLICY "Users can only access their locations" ON "Order"
  USING (location_id IN (
    SELECT location_id FROM user_location_map 
    WHERE user_id = current_user_id()
  ));

-- Role-based access (checklists visible to assigned roles)
CREATE POLICY "Users can see checklists assigned to their roles" ON "Checklist"
  USING (assigned_roles && current_user_roles());
```

### Key Security Features

- **Org Isolation**: Users completely isolated by organization
- **Location Filtering**: Stores see only their location data
- **Cascade Deletes**: Child records automatically deleted with parent
- **Foreign Key Constraints**: Referential integrity enforced
- **Timestamps**: Created/updated tracking for audit trail

### Append-Only Audit Log

```typescript
// Audit table structure
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action VARCHAR(50),
  resource VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
  -- NO UPDATE/DELETE allowed
);

// Capture every action
await logAuditAction(userId, 'order.created', 'Order', orderId, changes);
```

## 4. Data Protection

### Encryption

**In Transit**:
- HTTPS/TLS 1.2+ enforced in production
- All API calls encrypted end-to-end
- NextAuth uses secure cookies (HttpOnly, Secure, SameSite flags)

**At Rest**:
- Supabase provides transparent encryption for database
- Sensitive fields (passwords) hashed
- API keys stored as environment variables (never in code)

### Secrets Management

**Never in Code**:
```typescript
// ✅ CORRECT
const apiKey = process.env.SUPABASE_SERVICE_KEY;

// ❌ WRONG
const apiKey = 'sk-xxxxx'; // Exposed in version control
```

**Environment Variables**:
- `.env.local`: Local development only
- `.env.production`: Production secrets (in Netlify/platform UI only)
- `.env.example`: Template showing required variables
- `.gitignore`: Prevents accidental commits

### Sensitive Data Handling

```typescript
// Passwords
- Hash before storage
- Compare hashes during authentication
- Never log or expose

// API Keys
- Store in environment variables
- Rotate quarterly
- Use service accounts where possible

// User Sessions
- Short-lived JWT tokens (24 hours)
- HttpOnly cookies (JavaScript can't access)
- Secure flag (HTTPS only)
- SameSite=Strict (prevent CSRF)
```

## 5. API Security

### Authentication Headers

```bash
# Every request requires
Authorization: Bearer <JWT>
x-user-id: <uuid>
x-org-id: <uuid>
x-location-id: <uuid>
```

### Input Validation

```typescript
// Every endpoint validates input with Zod
const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    skuId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })),
  totalAmount: z.number().positive(),
});

const parsed = createOrderSchema.parse(req.body);
// Throws ValidationError if invalid
```

### Rate Limiting

- **Authenticated Endpoints**: 1000 req/hour per user
- **Login Endpoint**: 5 req/minute per IP
- **Public Endpoints**: 100 req/minute per IP

### CORS Policy

```typescript
// Only allow same-origin requests
// API and frontend on same domain
// No credentials sent to third-party APIs
```

### Security Headers

```typescript
// Set in next.config.js and netlify.toml
'X-Content-Type-Options': 'nosniff',
'X-Frame-Options': 'DENY',
'X-XSS-Protection': '1; mode=block',
'Referrer-Policy': 'strict-origin-when-cross-origin',
'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
```

## 6. Transaction Safety

### Database Transactions

```typescript
// All multi-step operations wrapped in transactions
const order = await db.$transaction(async (tx) => {
  // 1. Create order
  const order = await tx.order.create({ data: {...} });
  
  // 2. Create items
  for (const item of items) {
    await tx.orderItem.create({
      data: { orderId: order.id, ...item }
    });
  }
  
  // 3. Audit log
  await logAuditAction(...);
  
  // All succeed or all rollback
  return order;
});
```

### Conflict Handling

```typescript
// Prevent race conditions
try {
  await updateInventory(skuId, -quantity);
} catch (error) {
  if (error.code === 'P2025') {
    throw new ConflictError('SKU not found or already allocated');
  }
  throw error;
}
```

## 7. Error Handling

### Error Responses

Never expose sensitive information:

```typescript
// ✅ CORRECT - Safe error
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource"
  }
}

// ❌ WRONG - Leaks details
{
  "error": "user_id=123 doesn't have role 'admin' in org_id=456"
}
```

### Sensitive Error Details

- **To Logs**: Full error context for debugging
- **To Client**: Generic message only
- **To Admin**: Detailed logs in audit trail

```typescript
// Internal error handling
console.error(`User ${userId} denied access to ${resource}: ${reason}`);

// Client response
throw new ForbiddenError('You do not have permission to access this resource');
```

## 8. Audit Logging

### What Gets Logged

Every significant action:

```typescript
// Logged actions
- user.login / user.logout
- order.created / order.updated / order.deleted
- batch.created / batch.completed
- inventory.adjusted
- employee.created / employee.terminated
- user_role.assigned / user_role.revoked
- settings.changed
- rule.executed
- access.denied (permission failures)
```

### Log Contents

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "action": "order.created",
  "resource": "Order",
  "resourceId": "550e8400-e29b-41d4-a716-446655440001",
  "changes": {
    "status": "pending",
    "totalAmount": 5499.99
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "status": "success"
}
```

### Audit Log Access

```typescript
// Retrieve audit logs
const logs = await getAuditLogs({
  userId: '...',
  action: 'order.created',
  resourceType: 'Order',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  limit: 100,
  offset: 0,
});
```

### Retention

- Production: 7 years (regulatory requirement)
- Development: 30 days (space optimization)
- Compliance: Tamper-proof, append-only design

## 9. Production Security Checklist

- [ ] NEXTAUTH_SECRET generated with: `openssl rand -base64 32`
- [ ] ENCRYPTION_KEY generated with: `openssl rand -hex 32`
- [ ] DATABASE_URL uses connection pooling with password auth
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY restricted to Storage uploads only
- [ ] SUPABASE_SERVICE_KEY never exposed to frontend
- [ ] HTTPS/TLS 1.2+ enforced
- [ ] Security headers configured in netlify.toml
- [ ] CORS policy restricts to app domain only
- [ ] Rate limiting enabled on all public endpoints
- [ ] Audit logs enabled and monitored
- [ ] Database backups configured (daily minimum)
- [ ] Monitoring/alerts set up (Sentry)
- [ ] User roles audited quarterly
- [ ] Inactive users disabled monthly
- [ ] Security patches applied within 48 hours

## 10. Compliance

### Standards

- **OWASP Top 10**: Protections against SQL injection, XSS, CSRF, etc.
- **CWE**: Common Weakness Enumeration mitigations
- **GDPR**: Data isolation, access controls, audit trail
- **Local Regulations**: GST compliance, data residency

### Data Handling

- **PII Protection**: Personal data encrypted and access-controlled
- **Right to Access**: Users can request their data (export functionality)
- **Right to Deletion**: Data deleted with proper confirmation
- **Retention**: Clear data retention policies

## 11. Security Incident Response

### Incident Detection

1. Monitor audit logs for suspicious patterns
2. Alert on failed login attempts (5+ in 10 minutes)
3. Alert on unauthorized access attempts
4. Monitor database performance (potential DDoS)

### Response Procedure

1. **Detect**: Automated alerts or manual review
2. **Isolate**: Disable affected user/API key
3. **Investigate**: Review audit logs and error logs
4. **Remediate**: Fix vulnerability and patch code
5. **Restore**: Verify data integrity
6. **Post-Mortem**: Document and prevent recurrence

### Contact

Security incidents: security@doughhouse.local

## 12. Penetration Testing

Recommendations:

- Quarterly automated vulnerability scans
- Annual manual penetration testing
- Security code review for critical changes
- Dependency audits (npm audit, OWASP dependency check)

## 13. Code Security Review

### Best Practices

- **No Secrets in Code**: Use environment variables
- **Input Validation**: Always use Zod validation
- **Output Encoding**: HTML-escape user input in templates
- **Error Handling**: Don't expose stack traces to clients
- **Dependency Management**: Audit for vulnerabilities
- **Type Safety**: Use TypeScript strictly

### Pre-Commit Checks

```bash
# Run before commit
npm run lint              # ESLint
npm run type-check        # TypeScript
npm audit                 # Dependency vulnerabilities
```

## Conclusion

The Dough House implements comprehensive security at every layer:

1. **Authentication**: Secure password hashing, JWT tokens, session management
2. **Authorization**: RBAC with 15 roles, org/location scoping
3. **Data Protection**: Encryption in transit, RLS at database level
4. **Audit Trail**: Complete logging of all actions
5. **API Security**: Input validation, rate limiting, security headers
6. **Error Handling**: Safe error messages without information leakage
7. **Compliance**: GDPR, OWASP, industry standards

For security updates or vulnerability reports, contact security@doughhouse.local
