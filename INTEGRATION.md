# LAB DNA Scientific - System Integration Guide

This document explains how to integrate the client website with the existing LIMS system.

## System Overview

The complete system consists of:

1. **Client Website** (`/client-website/`) - Public website with authentication
2. **LIMS Application** (`/src/`) - Laboratory management system
3. **Backend API** (`/backend/`) - Shared authentication and data services

## Authentication Flow

### Staff Login Process
1. Staff member visits client website
2. Clicks "Staff Login" → `/staff-login`
3. Enters credentials and authenticates
4. Gets redirected to LIMS system at `http://localhost:3000`
5. JWT token is shared between systems

### Client Login Process
1. Client visits website
2. Clicks "Login" → `/login`
3. Enters credentials and authenticates
4. Accesses client portal at `/portal`
5. Views test results and downloads reports

## Backend Integration

### New Authentication Routes
```javascript
// Added to backend/routes/auth.js
POST /api/auth/login        - User login
GET  /api/auth/me          - Get current user
POST /api/auth/refresh     - Refresh JWT token
POST /api/auth/create-admin - Create admin user (dev only)
```

### Protected LIMS Routes
```javascript
// Updated backend/routes/api.js
POST /api/generate-batch   - Requires staff authentication
POST /api/save-batch      - Requires staff authentication
GET  /api/client/tests    - Client test results
GET  /api/client/test/:id/download - Download test results
```

### Middleware
- `authenticateToken` - Validates JWT tokens
- `requireStaff` - Ensures user has staff role

## Development Setup

### 1. Backend Setup
```bash
cd backend
npm install bcryptjs jsonwebtoken
npm run dev
```

### 2. LIMS Application (Existing)
```bash
npm run dev  # Runs on localhost:3000
```

### 3. Client Website
```bash
cd client-website
npm install
npm run dev  # Runs on localhost:3002
```

### 4. Environment Variables

**Backend (.env)**
```
JWT_SECRET=your-super-secure-jwt-secret-key
MAIN_SPREADSHEET_ID=your_main_sheet_id
BATCH_SPREADSHEET_ID=your_batch_sheet_id
PORT=3001
NODE_ENV=development
```

**Client Website (.env)**
```
VITE_API_URL=http://localhost:3001
VITE_LIMS_URL=http://localhost:3000
NODE_ENV=development
```

## Production Deployment

### 1. Backend Deployment
1. Deploy backend API to your server
2. Set production environment variables
3. Update CORS settings for production domains

### 2. LIMS Deployment
1. Update API URLs to production backend
2. Build and deploy LIMS application
3. Configure domain/subdomain (e.g., `lims.labdna.co.za`)

### 3. Client Website Deployment
1. Build website: `npm run build`
2. Deploy static files to web server
3. Configure domain (e.g., `www.labdna.co.za`)

### 4. SSL Certificates
Ensure all systems have SSL certificates for secure authentication.

## Testing the Integration

### 1. Test Staff Authentication
1. Go to `http://localhost:3002/staff-login`
2. Login with: `admin@labdna.co.za` / `admin123`
3. Should redirect to LIMS system

### 2. Test Client Authentication
1. Go to `http://localhost:3002/login`
2. Login with: `client@example.com` / `admin123`
3. Should access client portal with test results

### 3. Test API Protection
1. Try accessing `/api/generate-batch` without authentication (should fail)
2. Login as staff and try again (should succeed)

## User Management

### Default Users (Development)
```javascript
// In backend/routes/auth.js
{
  email: 'admin@labdna.co.za',
  password: 'admin123', // hashed in production
  name: 'Lab Administrator',
  role: 'staff'
},
{
  email: 'client@example.com',
  password: 'admin123', // hashed in production
  name: 'Test Client',
  role: 'client'
}
```

### Production User Setup
1. Create admin user via API: `POST /api/auth/create-admin`
2. Remove test credentials
3. Implement proper user registration process
4. Consider database integration instead of in-memory users

## Security Considerations

### JWT Configuration
- Use strong secret key (256-bit minimum)
- Set appropriate token expiration (24h default)
- Implement token refresh mechanism

### CORS Configuration
```javascript
// In backend/server.js
app.use(cors({
  origin: [
    'http://localhost:3000',  // LIMS
    'http://localhost:3002',  // Website
    'https://www.labdna.co.za',
    'https://lims.labdna.co.za'
  ],
  credentials: true
}));
```

### API Rate Limiting
Consider implementing rate limiting for authentication endpoints:
```javascript
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
});
app.use('/api/auth/login', authLimiter);
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check backend CORS configuration
   - Ensure frontend URLs are whitelisted

2. **Authentication Failures**
   - Verify JWT secret consistency
   - Check token expiration
   - Confirm user credentials

3. **Redirect Issues**
   - Verify LIMS URL configuration
   - Check protected route setup

4. **API Connection Problems**
   - Confirm backend is running
   - Check API URL configuration
   - Verify network connectivity

### Debugging

1. **Check Browser Console** for client-side errors
2. **Monitor Backend Logs** for authentication issues
3. **Use Network Tab** to inspect API requests
4. **Test API Endpoints** directly with tools like Postman

## Future Enhancements

1. **Database Integration**: Replace in-memory user store with proper database
2. **Email Verification**: Add email verification for new users
3. **Password Reset**: Implement password reset functionality
4. **Two-Factor Authentication**: Add 2FA for enhanced security
5. **Session Management**: Add session management and concurrent login limits
6. **Audit Logging**: Track user activities and login attempts