# 🔐 Development Test Credentials

This document contains all test account credentials for the Smart Union Parishad Management System in development mode.

## 🚀 Quick Access

- **Dev Login Page**: [http://localhost:3000/en/dev-login](http://localhost:3000/en/dev-login)
- **Regular Login**: [http://localhost:3000/en/login](http://localhost:3000/en/login)
- **API Endpoint**: [http://localhost:3000/api/auth/dev-quick-login](http://localhost:3000/api/auth/dev-quick-login)

---

## 👥 Test Accounts

All accounts share the same password for easy testing.

### Default Password
```
Dev@12345
```

> 💡 **Tip**: You can change the default dev password by setting the `DEV_QUICK_LOGIN_PASSWORD` environment variable.

---

### 1. 🔴 Super Admin
**Full system access with all permissions**

- **Email**: `dev.superadmin@smartunion.local`
- **Password**: `Dev@12345`
- **Role**: `SUPER_ADMIN`
- **Permissions**: Complete system control, user management, settings

---

### 2. 🟠 Admin
**Administrative access with most permissions**

- **Email**: `dev.admin@smartunion.local`
- **Password**: `Dev@12345`
- **Role**: `ADMIN`
- **Permissions**: Manage citizens, certificates, taxes, relief programs

---

### 3. 🔵 Operator
**Standard operational access**

- **Email**: `dev.operator@smartunion.local`
- **Password**: `Dev@12345`
- **Role**: `OPERATOR`
- **Permissions**: Create and update records, process applications

---

### 4. 🟢 Viewer
**Read-only access**

- **Email**: `dev.viewer@smartunion.local`
- **Password**: `Dev@12345`
- **Role**: `VIEWER`
- **Permissions**: View-only access to all data

---

## 🛠️ How to Use

### Method 1: Quick Login Page (Recommended)
1. Start the dev server: `npm run dev`
2. Visit: [http://localhost:3000/en/dev-login](http://localhost:3000/en/dev-login)
3. Click on any account card to auto-login

### Method 2: Login Page with Quick Login Buttons
1. Visit: [http://localhost:3000/en/login](http://localhost:3000/en/login)
2. Click "Load" in the "Development quick login" section
3. Click on any role button to auto-login

### Method 3: Manual Login
1. Visit: [http://localhost:3000/en/login](http://localhost:3000/en/login)
2. Enter email and password manually
3. Click "Login"

### Method 4: API Initialization
The accounts are automatically created when you:
- Visit `/api/auth/dev-quick-login` endpoint
- Click "Load" on the login page
- Visit the `/dev-login` page

---

## 🔒 Security Notes

- ⚠️ **These accounts only exist in development mode** (`NODE_ENV !== "production"`)
- ⚠️ The `/dev-login` page returns 404 in production
- ⚠️ The `/api/auth/dev-quick-login` endpoint is disabled in production
- ⚠️ All dev accounts use the same password for convenience
- ⚠️ Never use these credentials in production

---

## 🧪 Testing Scenarios

### Test User Roles
```bash
# Super Admin - Full access
Email: dev.superadmin@smartunion.local

# Admin - Most features
Email: dev.admin@smartunion.local

# Operator - Standard operations
Email: dev.operator@smartunion.local

# Viewer - Read-only
Email: dev.viewer@smartunion.local
```

### Test Permission Levels
1. **Login as Viewer** - Verify read-only restrictions
2. **Login as Operator** - Test CRUD operations
3. **Login as Admin** - Test approvals and management features
4. **Login as Super Admin** - Test system settings and user management

---

## 🔄 Account Management

### Recreate Accounts
Accounts are automatically created/updated via upsert, so they reset on each initialization.

### Change Password
Set environment variable:
```env
DEV_QUICK_LOGIN_PASSWORD=YourCustomPassword123
```

Then restart the dev server.

---

## 📋 Credentials Summary Table

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Super Admin | `dev.superadmin@smartunion.local` | `Dev@12345` | Full System |
| Admin | `dev.admin@smartunion.local` | `Dev@12345` | Management |
| Operator | `dev.operator@smartunion.local` | `Dev@12345` | Operations |
| Viewer | `dev.viewer@smartunion.local` | `Dev@12345` | Read-Only |

---

## 🎯 Quick Copy-Paste

Super Admin:
```
dev.superadmin@smartunion.local
Dev@12345
```

Admin:
```
dev.admin@smartunion.local
Dev@12345
```

Operator:
```
dev.operator@smartunion.local
Dev@12345
```

Viewer:
```
dev.viewer@smartunion.local
Dev@12345
```

---

**Generated for Smart Union Parishad Management System**
*Development Environment Only*
