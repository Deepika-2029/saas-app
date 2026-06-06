# ⚡ SaaSApp - Production-Ready MERN SaaS Boilerplate

A complete, production-level SaaS application built with MongoDB, Express.js, React, and Node.js.

## 🏗️ Project Structure

```
saas-app/
├── backend/                    # Express.js API server
│   ├── config/
│   │   └── database.js         # MongoDB connection
│   ├── controllers/            # Route controllers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── subscriptionController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── auth.js             # JWT auth + RBAC
│   │   ├── errorHandler.js     # Global error handler
│   │   ├── validate.js         # Input validation
│   │   └── auditLogger.js      # Audit trail
│   ├── models/
│   │   ├── User.js             # User schema + methods
│   │   ├── Subscription.js     # Subscription tracking
│   │   └── AuditLog.js         # Audit log (TTL: 90d)
│   ├── routes/
│   │   ├── auth.js             # /api/v1/auth/*
│   │   ├── users.js            # /api/v1/users/*
│   │   ├── subscriptions.js    # /api/v1/subscriptions/*
│   │   ├── admin.js            # /api/v1/admin/*
│   │   └── webhooks.js         # /api/v1/webhooks/stripe
│   ├── services/
│   │   ├── authService.js      # Auth business logic
│   │   └── subscriptionService.js # Stripe + billing
│   ├── utils/
│   │   ├── logger.js           # Winston logger
│   │   ├── AppError.js         # Custom error class
│   │   ├── apiResponse.js      # Standard responses
│   │   └── sendEmail.js        # Nodemailer
│   ├── logs/                   # Auto-created log files
│   ├── server.js               # App entry point
│   └── .env.example
├── frontend/                   # React application
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   └── shared/
│       │       └── Navbar.js
│       ├── context/
│       │   └── AuthContext.js  # Global auth state
│       ├── pages/
│       │   ├── LandingPage.js
│       │   ├── LoginPage.js
│       │   ├── RegisterPage.js
│       │   ├── ForgotPasswordPage.js
│       │   ├── ResetPasswordPage.js
│       │   ├── DashboardPage.js
│       │   ├── PricingPage.js
│       │   ├── ProfilePage.js
│       │   └── AdminPage.js
│       ├── services/
│       │   └── api.js          # Axios + auto token refresh
│       ├── styles/
│       │   └── global.css
│       └── App.js              # Router + route guards
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Stripe account (for billing)
- Gmail/SMTP account (for emails)

### 1. Clone & Install

```bash
git clone <repo-url>
cd saas-app
npm run install-all
```

### 2. Configure Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both .env files with your credentials
```

### 3. Run Development

```bash
npm run dev
# Backend: http://localhost:5000
# Frontend: http://localhost:3000
```

### 4. Run with Docker

```bash
docker-compose up -d
# App: http://localhost:5000
```

## 🔐 Authentication Flow

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Register + email verification |
| `/api/v1/auth/login` | POST | Login + JWT tokens |
| `/api/v1/auth/logout` | POST | Logout |
| `/api/v1/auth/verify-email/:token` | GET | Verify email |
| `/api/v1/auth/forgot-password` | POST | Send reset email |
| `/api/v1/auth/reset-password/:token` | POST | Reset password |
| `/api/v1/auth/refresh-token` | POST | Refresh access token |
| `/api/v1/auth/me` | GET | Get current user |

## 👤 User Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/users/profile` | GET/PUT | ✅ | Get/update profile |
| `/api/v1/users/change-password` | PUT | ✅ | Change password |
| `/api/v1/users/usage` | GET | ✅ | API usage stats |
| `/api/v1/users/account` | DELETE | ✅ | Deactivate account |

## 💳 Subscription Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/subscriptions/plans` | GET | ❌ | List all plans |
| `/api/v1/subscriptions/checkout` | POST | ✅ | Create Stripe session |
| `/api/v1/subscriptions/cancel` | POST | ✅ | Cancel subscription |
| `/api/v1/subscriptions/invoices` | GET | ✅ | Billing history |

## 🛡️ Admin Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/v1/admin/stats` | GET | admin | Platform stats |
| `/api/v1/admin/users` | GET | admin | List users (paginated) |
| `/api/v1/admin/users/:id/role` | PUT | admin | Update user role |
| `/api/v1/admin/users/:id/toggle-status` | PUT | admin | Activate/deactivate |
| `/api/v1/admin/audit-logs` | GET | admin | View audit trail |

## 📋 Subscription Plans

| Plan | Price | API Calls | Storage |
|------|-------|-----------|---------|
| Free | $0/mo | 100/mo | 100MB |
| Basic | $9.99/mo | 1,000/mo | 1GB |
| Pro | $29.99/mo | 10,000/mo | 10GB |
| Enterprise | $99.99/mo | Unlimited | Unlimited |

## 🔒 Security Features

- ✅ JWT access + refresh tokens
- ✅ Account lockout after 5 failed attempts
- ✅ Rate limiting (100 req/15min; 10 req/15min for auth)
- ✅ Helmet.js security headers
- ✅ MongoDB injection sanitization
- ✅ Input validation with express-validator
- ✅ Bcrypt password hashing (12 rounds)
- ✅ Email verification
- ✅ Password reset with expiry
- ✅ Audit logging with TTL

### ⚠️ Secret Rotation
If `backend/.env` was ever committed to Git (even once), rotate these immediately:
- **Stripe**: Stripe Dashboard → Developers → API Keys → Roll key
- **JWT secrets**: Generate new random 256-bit strings and update backend/.env
- **SMTP password**: Gmail → Security → App Passwords → Revoke and regenerate
- Run `git rm --cached backend/.env` to stop tracking the file

## ☁️ Deployment (Production)

### Environment Setup
```bash
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/saasapp
JWT_SECRET=<random-256-bit-secret>
STRIPE_SECRET_KEY=sk_live_xxx
```

### Deploy to VPS
```bash
docker-compose up -d --build
```

### Deploy to Render/Railway
1. Connect GitHub repo
2. Set environment variables
3. Set build command: `npm run install-all && npm run build`
4. Set start command: `npm start`

### Deploy to AWS/GCP
- Use Docker image with ECR/GCR
- Deploy with ECS/Cloud Run
- Use managed MongoDB Atlas
- Configure load balancer

## 🧪 Automated Testing

The backend includes a comprehensive test suite using **Jest**, **Supertest**, and **node-mocks-http**. Tests are organized under `backend/tests/` and cover authentication, subscription billing flows, custom middlewares, and API rate limiters.

### Run Tests from Root
```bash
# Run all tests once
npm run test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Run Tests in Backend Directory
```bash
cd backend
npm run test
```

---

## 📊 Monitoring & Logs

### 1. Sentry Error Tracking (Production Monitoring)
Sentry is fully integrated into both the **Frontend** and **Backend** to track and report errors in real-time.

- **Backend Integration**: 
  - Automatically captures uncaught exceptions, unhandled rejections, and HTTP `500` server errors.
  - Attaches authenticated user context (User ID, Email, Role, IP Address) to error reports.
  - Configured in `backend/config/sentry.js` and initialized in `backend/server.js`.
  - To enable, set `SENTRY_DSN` in `backend/.env`.

- **Frontend Integration**:
  - Automatically captures JavaScript execution runtime errors.
  - Includes a global **React Error Boundary** (`SentryErrorBoundary`) to prevent application crashes and display a fallback UI.
  - Tracks user login/logout events to attach user context to frontend crashes.
  - Configured in `frontend/src/utils/sentry.js` and initialized in `frontend/src/index.js`.
  - To enable, set `REACT_APP_SENTRY_DSN` in `frontend/.env`.

### 2. Local Logs & Audit Trail
- **Winston** logs → `backend/logs/combined.log` and `backend/logs/error.log`
- **Morgan** HTTP access logs → piped to Winston
- **Audit logs** → Saved in MongoDB (automatically deleted after 90 days via TTL index)

---

## 🛠️ Tech Stack

**Backend:** Node.js, Express.js, MongoDB, Mongoose, Jest, Supertest, Winston, Helmet, Stripe, Nodemailer, Sentry Node

**Frontend:** React 18, React Router v6, Axios, Recharts, React Hot Toast, Sentry React

**DevOps:** Docker, Docker Compose, Nginx, Git

## 📧 Contact & Support

Built as a production capstone project demonstrating Full Stack SaaS development skills.
