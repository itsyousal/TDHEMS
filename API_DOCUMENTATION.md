# The Dough House - API Documentation

## Base Configuration

### Authentication

All API requests must include the `Authorization` header with a bearer token obtained from `/api/auth/login`:

```bash
Authorization: Bearer <token>
```

### Context Headers (Required)

For all API requests, include:

```bash
x-user-id: <uuid>        # User's UUID
x-org-id: <uuid>         # Organization UUID
x-location-id: <uuid>    # Location UUID (optional for org-wide operations)
```

### Response Format

All responses follow this format:

**Success (2xx)**:
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error (4xx/5xx)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": { /* detailed error info */ }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Authentication Endpoints

### POST /api/auth/login

User login with email and password.

**Request**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure-password"
  }'
```

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email address |
| password | string | Yes | User password (min 6 chars) |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "roles": [
        { "id": "...", "name": "General Manager", "organizationId": "..." }
      ]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation error (missing/invalid fields)
- `401 Unauthorized`: Invalid email/password
- `403 Forbidden`: User account inactive (not yet activated)

---

## Orders Endpoints

### GET /api/orders

List orders with filtering and pagination.

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | - | Filter by status: pending, confirmed, in_production, ready_for_shipment, shipped, delivered, cancelled |
| limit | number | 20 | Results per page (max 100) |
| offset | number | 0 | Number of results to skip |

**Request**:
```bash
curl http://localhost:3000/api/orders?status=pending&limit=20&offset=0 \
  -H "Authorization: Bearer <token>" \
  -H "x-user-id: <uuid>" \
  -H "x-org-id: <uuid>"
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "orderNumber": "ORD-12345-000001",
        "channelSourceId": "...",
        "customerId": "...",
        "status": "pending",
        "totalAmount": 5499.99,
        "items": [
          {
            "id": "...",
            "skuId": "...",
            "quantity": 2,
            "unitPrice": 2749.99,
            "subtotal": 5499.99
          }
        ],
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 145,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid filter/pagination
- `401 Unauthorized`: Invalid/missing token
- `403 Forbidden`: No permission to view orders

---

### POST /api/orders

Create a new order.

**Request Body**:
```json
{
  "channelSourceId": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "550e8400-e29b-41d4-a716-446655440001",
  "items": [
    {
      "skuId": "550e8400-e29b-41d4-a716-446655440002",
      "quantity": 2,
      "unitPrice": 2749.99
    }
  ],
  "totalAmount": 5499.99
}
```

**Request**:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "x-user-id: <uuid>" \
  -H "x-org-id: <uuid>" \
  -d '{...}'
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "orderNumber": "ORD-12345-000002",
    "status": "pending",
    "totalAmount": 5499.99,
    "items": [...]
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing/invalid required fields
- `403 Forbidden`: No permission to create orders
- `409 Conflict`: SKU not found or unavailable

---

## Production Batch Endpoints

### GET /api/batches

List production batches.

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | - | pending, in_production, qc_hold, completed, cancelled |
| limit | number | 20 | Results per page |
| offset | number | 0 | Pagination offset |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "batches": [
      {
        "id": "...",
        "batchNumber": "BATCH-001",
        "status": "in_production",
        "plannedDate": "2024-01-15T08:00:00Z",
        "completedDate": null,
        "bomId": "...",
        "ingredients": [
          {
            "id": "...",
            "ingredientId": "...",
            "requiredQuantity": 100,
            "actualQuantity": 100,
            "unit": "kg"
          }
        ]
      }
    ],
    "pagination": { /* ... */ }
  }
}
```

---

### POST /api/batches

Create a new production batch.

**Request Body**:
```json
{
  "batchNumber": "BATCH-002",
  "bomId": "550e8400-e29b-41d4-a716-446655440000",
  "plannedDate": "2024-01-16T08:00:00Z",
  "ingredients": [
    {
      "ingredientId": "...",
      "requiredQuantity": 100,
      "unit": "kg"
    }
  ]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "batchNumber": "BATCH-002",
    "status": "pending"
  }
}
```

---

## Inventory Endpoints

### GET /api/inventory

List current inventory levels.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| warehouseId | string | Filter by warehouse |
| lowStockOnly | boolean | Show only low-stock items |
| limit | number | Results per page (default: 20) |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "id": "...",
        "skuId": "...",
        "warehouseId": "...",
        "availableQuantity": 500,
        "reservedQuantity": 50,
        "damagedQuantity": 5,
        "expiredQuantity": 0,
        "reorderPoint": 100,
        "isLowStock": false
      }
    ]
  }
}
```

---

### PATCH /api/inventory/:id

Adjust inventory quantity.

**Request Body**:
```json
{
  "adjustmentType": "correction|damage|expiry|sale|receipt",
  "quantity": 10,
  "reason": "Stock count correction",
  "reference": "COUNT-2024-01-15"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "availableQuantity": 510,
    "ledgerEntry": {
      "id": "...",
      "type": "correction",
      "quantity": 10,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

## Warehouse & Fulfillment Endpoints

### GET /api/pick-lists

List pick lists.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "pickLists": [
      {
        "id": "...",
        "pickListNumber": "PICK-001",
        "orderId": "...",
        "status": "pending|in_progress|completed|cancelled",
        "items": [
          {
            "id": "...",
            "skuId": "...",
            "binId": "...",
            "quantity": 2,
            "picked": false
          }
        ]
      }
    ]
  }
}
```

---

### POST /api/pick-lists/:id/items/:itemId/pick

Mark a pick list item as picked.

**Request Body**:
```json
{
  "quantity": 2,
  "batchNumber": "BATCH-001"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "pickListItem": {
      "id": "...",
      "picked": true,
      "pickedBy": "...",
      "pickedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

## HR Endpoints

### GET /api/employees

List employees.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| locationId | string | Filter by location |
| status | string | active|inactive|terminated |
| limit | number | Results per page |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": "...",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@dough.local",
        "phone": "+1234567890",
        "role": "Kitchen Assistant",
        "locationId": "...",
        "status": "active",
        "hireDate": "2023-06-01",
        "attendanceRate": 98.5
      }
    ]
  }
}
```

---

### POST /api/employees

Add a new employee.

**Request Body**:
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@dough.local",
  "phone": "+1234567891",
  "role": "Store Manager",
  "locationId": "...",
  "hireDate": "2024-01-15"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "firstName": "Jane",
    "status": "active"
  }
}
```

---

### POST /api/attendance

Clock in/out.

**Request Body**:
```json
{
  "employeeId": "...",
  "eventType": "clock_in|clock_out",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "employeeId": "...",
    "eventType": "clock_in",
    "timestamp": "2024-01-15T08:00:00Z"
  }
}
```

---

## Marketing Endpoints

### GET /api/campaigns

List marketing campaigns.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "...",
        "name": "Summer Sale 2024",
        "description": "20% off all items",
        "status": "draft|active|scheduled|completed|archived",
        "startDate": "2024-06-01",
        "endDate": "2024-06-30",
        "channels": ["email", "social", "in_store"],
        "metrics": {
          "reach": 50000,
          "engagement": 5000,
          "conversions": 500
        }
      }
    ]
  }
}
```

---

### POST /api/campaigns

Create a campaign.

**Request Body**:
```json
{
  "name": "Flash Sale",
  "description": "48-hour limited offer",
  "channels": ["email", "social"],
  "startDate": "2024-01-20",
  "endDate": "2024-01-22"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Flash Sale",
    "status": "draft"
  }
}
```

---

## CRM Endpoints

### GET /api/customers

List customers.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| segment | string | Filter by segment |
| limit | number | Results per page |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "...",
        "name": "John Customer",
        "email": "john@email.com",
        "phone": "+1234567890",
        "totalOrders": 5,
        "totalSpend": 15000,
        "lastOrderDate": "2024-01-10",
        "loyaltyPoints": 1500
      }
    ]
  }
}
```

---

### POST /api/customers

Create a customer.

**Request Body**:
```json
{
  "name": "Jane Customer",
  "email": "jane@email.com",
  "phone": "+1234567891",
  "segment": "retail"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Jane Customer"
  }
}
```

---

## Finance Endpoints

### GET /api/invoices

List invoices.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | draft|sent|paid|overdue|cancelled |
| limit | number | Results per page |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "...",
        "invoiceNumber": "INV-2024-001",
        "customerId": "...",
        "amount": 5000,
        "taxAmount": 500,
        "totalAmount": 5500,
        "status": "sent",
        "dueDate": "2024-02-15",
        "issuedDate": "2024-01-15"
      }
    ]
  }
}
```

---

### POST /api/invoices

Create an invoice.

**Request Body**:
```json
{
  "customerId": "...",
  "items": [
    {
      "description": "Chocolate Cake",
      "quantity": 10,
      "unitPrice": 450,
      "taxRate": 0.18
    }
  ]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "invoiceNumber": "INV-2024-002"
  }
}
```

---

## Checklist Endpoints

### GET /api/checklists

List checklists.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "checklists": [
      {
        "id": "...",
        "name": "Daily Opening Check",
        "frequency": "daily",
        "items": [
          {
            "id": "...",
            "description": "Temperature check",
            "order": 1
          }
        ],
        "assignedRoles": ["Kitchen Assistant", "Store Manager"]
      }
    ]
  }
}
```

---

### POST /api/checklists/:id/runs

Start a checklist run.

**Request Body**:
```json
{
  "completedBy": "...",
  "timestamp": "2024-01-15T08:00:00Z"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "checklistId": "...",
    "status": "in_progress"
  }
}
```

---

### POST /api/checklists/runs/:runId/evidence

Add evidence to a checklist item.

**Request Body** (multipart/form-data):
```
photo: <file>
itemId: <uuid>
notes: "Temperature normal"
status: "pass|fail|na"
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "photoUrl": "https://...",
    "status": "pass"
  }
}
```

---

## Rule Engine Endpoints

### GET /api/rules

List automation rules.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "rules": [
      {
        "id": "...",
        "name": "Auto-create PO when low stock",
        "trigger": "threshold",
        "conditions": [
          {
            "field": "inventory.availableQuantity",
            "operator": "lt",
            "value": 100
          }
        ],
        "actions": [
          {
            "type": "create_po",
            "data": { "quantity": 500 }
          }
        ],
        "enabled": true
      }
    ]
  }
}
```

---

### POST /api/rules

Create an automation rule.

**Request Body**:
```json
{
  "name": "Alert on overdue invoices",
  "trigger": "threshold",
  "conditions": [
    {
      "field": "invoice.daysOverdue",
      "operator": "gte",
      "value": 7
    }
  ],
  "actions": [
    {
      "type": "send_notification",
      "data": { "template": "overdue_alert" }
    }
  ]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Alert on overdue invoices"
  }
}
```

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|------------|-------------|
| VALIDATION_ERROR | 400 | Missing or invalid request parameters |
| UNAUTHORIZED | 401 | Missing or invalid authentication token |
| FORBIDDEN | 403 | User lacks required permissions |
| NOT_FOUND | 404 | Requested resource not found |
| CONFLICT | 409 | Resource already exists or constraint violated |
| RATE_LIMITED | 429 | Too many requests (rate limit exceeded) |
| INTERNAL_SERVER_ERROR | 500 | Unexpected server error |

---

## Rate Limits

- **Authenticated endpoints**: 1000 requests per hour per user
- **Login endpoint**: 5 requests per minute per IP
- **Public endpoints**: 100 requests per minute per IP

---

## Pagination

All list endpoints support pagination:

```json
"pagination": {
  "total": 150,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

Use `offset` = current `limit` to get next page.

---

## Filtering & Sorting

Most list endpoints support:

```bash
# Filtering
?status=pending&channel=email

# Sorting
?sort=-createdAt,name

# Combining
?status=active&sort=-sales&limit=50
```

---

## API Webhooks (Future)

Webhooks will be supported for:
- order.created
- order.updated
- batch.completed
- invoice.paid
- rule.triggered

Configure via: Settings → Integrations → Webhooks
