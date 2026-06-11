# 🚀 RentFlow Authentication - Quick Start Guide

## What's Been Implemented

You now have a **complete JWT-based authentication system** with:

✅ **Backend**
- JWT authentication middleware protecting all API routes
- Login/signup endpoints with password hashing (bcryptjs)
- User database table with role support for future admin features
- 7-day token expiration
- Admin user seed script

✅ **Frontend**
- Login page with email/password fields
- Global auth state management (React Context)
- Automatic token storage and validation
- Protected routing (unauthenticated users see Login page)
- Logout button in topbar with user info display
- Demo credentials pre-filled for easy testing

## Quick Start (3 Steps)

### Step 1: Create Environment File
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add:
```
JWT_SECRET=your-super-secret-key-change-in-production
DATABASE_URL=postgresql://user:password@localhost:5432/rental_db
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Step 2: Create Admin User
```bash
cd backend
node src/config/seedAdmin.js
```

Output should show:
```
🌱 Seeding admin user...
✅ Admin user created: admin@rentflow.com
```

### Step 3: Start the Servers
**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

## Testing the System

1. **Open Browser:** http://localhost:5173
2. **See Login Page:** You're automatically redirected (not authenticated yet)
3. **Login:** Use demo credentials or from seed script
   - Email: `admin@rentflow.com`
   - Password: `Admin@123`
4. **After Login:**
   - Dashboard appears
   - User name & email shown in top-right
   - Token stored in browser localStorage
5. **Test Logout:** Click logout button → returns to login page

## How It Works

### Authentication Flow
```
User enters credentials
    ↓
Frontend calls /api/auth/login
    ↓
Backend validates password with bcryptjs.compare()
    ↓
JWT token generated (7-day expiry)
    ↓
Frontend stores token in localStorage
    ↓
AuthContext updates → App shows Dashboard
```

### Protected Routes
```
Frontend makes request to /api/invoices
    ↓
JWT middleware checks Authorization header
    ↓
Token validated with JWT_SECRET
    ↓
User data attached to request
    ↓
API executes or returns 401 Unauthorized
```

## Key Features

- **Passwords:** Hashed with bcryptjs (10 salt rounds) - never stored as plain text
- **Tokens:** JWT with 7-day expiry time
- **Storage:** Browser localStorage (consider httpOnly cookies in production)
- **Roles:** User table supports role-based access (admin/user) for future implementation
- **Session:** Persists across page refreshes using localStorage
- **UI:** Auto-logout on token expiry (future enhancement)

## Troubleshooting

### "404 Not Found" on Login
- Ensure backend is running (`npm start` in backend directory)
- Check PORT=5000 in backend/.env
- Check VITE_API_URL=http://localhost:5000/api in frontend

### "401 Unauthorized" errors
- Verify JWT_SECRET in .env matches JWT_SECRET in code
- Check token exists in browser DevTools → Application → Local Storage
- Try logging out and logging back in

### "Admin user already exists" when seeding
- Admin already created - just login with credentials
- To reset: Delete from database manually or modify seed script

### Password comparison failures
- Ensure bcryptjs is installed: `npm list bcryptjs` (in backend)
- Verify password wasn't changed in seed script

## File Structure

```
backend/
  src/
    middleware/
      authJwt.js           # JWT validation middleware
    controllers/
      auth.controller.js   # Login/signup logic
    routes/
      auth.routes.js       # Auth endpoints
    config/
      seedAdmin.js         # Create admin user
      schema.sql           # Database with users table

client/
  src/
    contexts/
      AuthContext.jsx      # Global auth state
    api/
      auth.api.js          # API client
    pages/
      Login.jsx            # Login form
    App.jsx                # Main app with auth
```

## API Endpoints

### Public (No JWT Required)
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/signup` - Create new user account

### Protected (JWT Required)
- `GET /api/auth/me` - Get current user info
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- *All other API routes*

## Security Notes

1. **Change Default Password:** After first login with Admin@123, update it
2. **Set Secure JWT_SECRET:** Use a strong random string in production
3. **Use HTTPS:** Required for token transmission in production
4. **Environment Variables:** Never commit .env file to git
5. **Token Refresh:** Consider implementing refresh tokens for better security

## Next Steps (Optional Enhancements)

1. **Email Verification:** Require email confirmation on signup
2. **Password Reset:** Implement forgot password flow
3. **Token Refresh:** Add refresh token mechanism
4. **2FA:** Two-factor authentication
5. **Audit Logging:** Track login/logout events
6. **Role-Based UI:** Show/hide features based on user role
7. **httpOnly Cookies:** Move JWT to secure cookies instead of localStorage

---

**Questions or issues?** Check AUTHENTICATION_SETUP.md for detailed documentation and troubleshooting.
