# REST API Reference

Complete reference for the New Life Nursery REST API (v1).

## Base URL

```
Development: http://localhost:5331/api/rest/v1
Production:  https://newlifenurseryinc.com/api/rest/v1
```

## Authentication

Most endpoints require authentication via JWT tokens stored in HTTP-only cookies.

### Authentication Levels

1. **Public** - No authentication required
2. **Authenticated** - Requires valid JWT token (any logged-in user)
3. **Admin** - Requires admin role

### Authentication Header

The JWT token is automatically included in cookies. No manual header configuration needed for authenticated requests.

## Response Format

### Success Response
```json
{
  "data": { ...response data... }
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `BadCredentials` | Invalid email or password | 401 |
| `NoCustomer` | Customer not found | 404 |
| `SoftLockout` | Account temporarily locked (5+ failed attempts) | 423 |
| `HardLockout` | Account permanently locked (15+ failed attempts) | 423 |
| `MustResetPassword` | Password reset required | 403 |
| `InvalidResetCode` | Password reset token expired/invalid | 400 |
| `Unauthorized` | Authentication required | 401 |
| `Forbidden` | Insufficient permissions | 403 |
| `NotFound` | Resource not found | 404 |
| `ValidationError` | Input validation failed | 400 |

---

## Endpoints

## 1. Health & Info

### GET /health

Check API health status.

**Authentication**: Public

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-14T10:30:00.000Z"
}
```

---

### GET /

Get API information and available endpoints.

**Authentication**: Public

**Response**:
```json
{
  "name": "New Life Nursery REST API",
  "version": "1.0.0",
  "endpoints": {
    "v1": { ... }
  }
}
```

---

## 2. Authentication

### POST /auth/login

Authenticate a user with email and password.

**Authentication**: Public

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "verificationCode": "optional-verification-code"
}
```

**Response** (Success - 200):
```json
{
  "id": "customer-id",
  "emailVerified": true,
  "accountApproved": true,
  "status": "Unlocked",
  "theme": "light",
  "roles": [
    {
      "role": {
        "title": "Customer",
        "description": "Standard customer account"
      }
    }
  ]
}
```

**Response** (Error - 401):
```json
{
  "error": "Invalid email or password",
  "code": "BadCredentials"
}
```

**Response** (Account Locked - 423):
```json
{
  "error": "Account temporarily locked. Try again in 5 minutes.",
  "code": "SoftLockout"
}
```

**Notes**:
- Sets HTTP-only cookie with JWT token
- Account locks after 5 failed attempts (soft lock - 5 min)
- Account permanently locks after 15 failed attempts (hard lock)
- Login attempts reset after 15 minutes of no activity

---

### POST /auth/logout

Log out the current user.

**Authentication**: Authenticated

**Request Body**: Empty

**Response** (200):
```json
{
  "success": true
}
```

**Notes**:
- Clears the JWT cookie
- No errors returned (always succeeds)

---

### POST /auth/signup

Register a new customer account.

**Authentication**: Public

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "pronouns": "he/him",
  "business": "John's Garden Center",
  "email": "john@example.com",
  "phone": "+1234567890",
  "accountApproved": false,
  "theme": "light",
  "marketingEmails": true,
  "password": "securePassword123"
}
```

**Response** (200):
```json
{
  "id": "customer-id",
  "emailVerified": false,
  "accountApproved": false,
  "status": "Unlocked",
  "theme": "light",
  "roles": [
    {
      "role": {
        "title": "Customer",
        "description": "Standard customer account"
      }
    }
  ]
}
```

**Response** (Error - 400):
```json
{
  "error": "Email already exists",
  "code": "ValidationError"
}
```

**Notes**:
- Automatically logs in the new user (sets JWT cookie)
- Sends verification email to provided address
- Sends notification email to admin
- Password must meet strength requirements (8+ chars, mixed case, numbers)

---

### POST /auth/request-password-change

Request a password reset link via email.

**Authentication**: Public

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200):
```json
{
  "success": true
}
```

**Notes**:
- Always returns success (even if email doesn't exist - security)
- Sends password reset email with token
- Token expires after 48 hours
- Generates 32-character random token

---

### POST /auth/reset-password

Reset password using a token received via email.

**Authentication**: Public

**Request Body**:
```json
{
  "token": "customer-id:reset-code",
  "password": "newSecurePassword123"
}
```

**Response** (200):
```json
{
  "id": "customer-id",
  "emailVerified": true,
  "accountApproved": true,
  "status": "Unlocked",
  "theme": "light",
  "roles": [...]
}
```

**Response** (Error - 400):
```json
{
  "error": "Invalid or expired reset token",
  "code": "InvalidResetCode"
}
```

**Notes**:
- Token format: `{customerId}:{resetCode}`
- Token expires after 48 hours
- Password must meet strength requirements
- If token expired, automatically sends new reset email

---

## 3. Landing Page

### GET /landing-page

Get all landing page content (hero banners, contact info, seasonal content).

**Authentication**: Public

**Response** (200):
```json
{
  "heroBanners": [
    {
      "id": "banner-1",
      "alt": "Spring flowers",
      "description": "Beautiful spring collection",
      "index": 0,
      "active": true,
      "imageUrl": "/api/images/hero-banner-1.jpg"
    }
  ],
  "business": {
    "id": "business-1",
    "subscribedToNewsletters": true,
    "discountIds": [],
    "employeeIds": [],
    "name": "New Life Nursery",
    "hours": [
      {
        "day": "Monday",
        "opens": "09:00",
        "closes": "17:00",
        "closed": false
      }
    ],
    "notes": "Special holiday hours may apply"
  },
  "seasonalPlants": [
    {
      "id": "plant-1",
      "name": "Rose Bush",
      "description": "Beautiful red roses",
      "active": true,
      "imageUrl": "/api/images/rose-bush.jpg"
    }
  ],
  "careTips": [
    {
      "id": "tip-1",
      "title": "Watering Guidelines",
      "description": "How to properly water your plants",
      "active": true
    }
  ]
}
```

**Notes**:
- Returns all publicly visible landing page content
- Used by frontend to render homepage
- No pagination (all data returned in one call)

---

### PUT /landing-page

Update landing page content (Admin only).

**Authentication**: Admin

**Request Body**:
```json
{
  "heroBanners": [...],
  "business": {...},
  "seasonalPlants": [...],
  "careTips": [...]
}
```

**Response** (200):
```json
{
  "success": true
}
```

**Response** (Error - 403):
```json
{
  "error": "Admin access required",
  "code": "Forbidden"
}
```

---

## 4. Plants

### GET /plants

Get all plants (with optional filtering).

**Authentication**: Public

**Query Parameters**:
- `seasonal`: `true` | `false` - Filter for seasonal plants only
- `active`: `true` | `false` - Filter for active plants only

**Response** (200):
```json
{
  "plants": [
    {
      "id": "plant-1",
      "name": "Rose Bush",
      "scientificName": "Rosa spp.",
      "description": "Beautiful flowering shrub",
      "active": true,
      "seasonal": true,
      "imageUrl": "/api/images/rose-bush.jpg",
      "traits": ["Perennial", "Full Sun", "Zone 5-9"],
      "skus": [
        {
          "id": "sku-1",
          "sku": "ROSE-001",
          "price": 24.99,
          "size": "1 gallon",
          "availability": "In Stock"
        }
      ]
    }
  ]
}
```

---

### POST /plants

Create a new plant (Admin only).

**Authentication**: Admin

**Request Body**:
```json
{
  "name": "Rose Bush",
  "scientificName": "Rosa spp.",
  "description": "Beautiful flowering shrub",
  "active": true,
  "seasonal": true,
  "traits": ["Perennial", "Full Sun", "Zone 5-9"],
  "skus": [...]
}
```

**Response** (201):
```json
{
  "id": "plant-1",
  "name": "Rose Bush",
  ...
}
```

---

### PUT /plants/:id

Update an existing plant (Admin only).

**Authentication**: Admin

**URL Parameters**:
- `id`: Plant ID

**Request Body**: Same as POST /plants

**Response** (200):
```json
{
  "id": "plant-1",
  "name": "Rose Bush (Updated)",
  ...
}
```

---

### DELETE /plants/:id

Delete a plant (Admin only).

**Authentication**: Admin

**URL Parameters**:
- `id`: Plant ID

**Response** (200):
```json
{
  "success": true
}
```

---

## 5. Images

### GET /images

Get images by label.

**Authentication**: Public

**Query Parameters**:
- `label`: Image label (e.g., `hero-banner`, `plant`, `logo`)

**Response** (200):
```json
{
  "images": [
    {
      "id": "image-1",
      "url": "/api/images/hero-banner-1.jpg",
      "alt": "Spring flowers",
      "label": "hero-banner",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST /images

Upload new images (Admin only).

**Authentication**: Admin

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `files`: File uploads (multiple)
- `label`: Image label
- `alt`: Alt text (optional)

**Response** (200):
```json
{
  "images": [
    {
      "id": "image-1",
      "url": "/api/images/new-image.jpg",
      "alt": "Uploaded image",
      "label": "hero-banner"
    }
  ]
}
```

**Notes**:
- Max file size: 10MB per file
- Supported formats: JPG, PNG, GIF, WebP
- Files stored in `PROJECT_DIR/assets/images/`

---

### PUT /images

Update image metadata (Admin only).

**Authentication**: Admin

**Request Body**:
```json
{
  "id": "image-1",
  "alt": "Updated alt text",
  "label": "hero-banner"
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

## 6. Assets

### GET /assets/read

Read asset file contents (Admin only).

**Authentication**: Admin

**Query Parameters**:
- `path`: Relative path to asset file

**Response** (200):
```json
{
  "content": "... file contents ...",
  "path": "terms.md"
}
```

---

### POST /assets/write

Write to asset file (Admin only).

**Authentication**: Admin

**Request Body**:
```json
{
  "path": "terms.md",
  "content": "Updated content..."
}
```

**Response** (200):
```json
{
  "success": true
}
```

**Notes**:
- Used for editing static markdown files (terms, privacy, etc.)
- Files stored in `PROJECT_DIR/assets/public/`

---

## 7. Dashboard

### GET /dashboard/stats

Get admin dashboard statistics (Admin only).

**Authentication**: Admin

**Response** (200):
```json
{
  "stats": {
    "totalPlants": 45,
    "activePlants": 32,
    "seasonalPlants": 12,
    "totalCustomers": 127,
    "activeOrders": 8,
    "totalRevenue": 5432.50,
    "recentOrders": [...]
  }
}
```

---

## Rate Limiting

Currently no rate limiting is enforced. Future versions may implement:
- 100 requests per minute per IP
- 1000 requests per hour per authenticated user

## Caching

API responses are not currently cached. Future versions may implement:
- Redis caching for frequently accessed data
- ETags for conditional requests
- Cache-Control headers

## Versioning

The API is versioned via URL path (`/v1/`). Breaking changes will result in a new version (`/v2/`).

## CORS

CORS is enabled for:
- Development: `http://localhost:3001`
- Production: `https://newlifenurseryinc.com`

Credentials (cookies) are allowed for all origins.

## Related Documentation

- [Authentication Guide](authentication.md) - Detailed auth flow documentation
- [Error Handling](error-codes.md) - Complete error code reference
- [Architecture Overview](../architecture/overview.md) - System architecture

---

**Last Updated**: October 14, 2025
**API Version**: 1.0.0
