# Driver Creation Fix - Complete Documentation

## Problem Statement

**Error:** `violates foreign key constraint "drivers_company_id_foreign"` when creating drivers

**Root Cause:** The authenticated user's `company_id` is missing, null, or invalid in the JWT token, or the companies table hasn't been seeded with initial data.

## Architecture Overview

### Multi-Tenant Data Flow

```
Frontend Form
    ↓
API Request (no company_id sent)
    ↓
Auth Middleware (extracts JWT)
    ↓
Tenant Middleware (validates companyId from JWT)
    ↓
Driver Controller (receives req.tenantContext.companyId)
    ↓
Driver Service (injects company_id from tenantContext)
    ↓
Driver Repository (inserts driver with company_id)
    ↓
PostgreSQL Database (validates FK: company_id → companies.id)
```

## Component Details

### 1. Frontend (React + TypeScript)

**File:** `frontend/src/pages/admin/DriversPage.tsx`

**What It Does:**
- Collects driver form data: `first_name`, `last_name`, `license_number`, `license_state`, `phone`, `email`, `status`, `notes`
- **DOES NOT** send `company_id` (security by design)
- Calls `driversApi.createDriver(payload)`

**Critical Code:**
```typescript
const payload: any = {
  first_name: formData.first_name.trim(),
  last_name: formData.last_name.trim(),
  license_number: formData.license_number.trim(),
  status: formData.status,
};
if (formData.license_state.trim()) payload.license_state = formData.license_state.trim();
if (formData.phone.trim()) payload.phone = formData.phone.trim();
if (formData.email.trim()) payload.email = formData.email.trim();
if (formData.notes.trim()) payload.notes = formData.notes.trim();
// NOTE: company_id is NOT included
```

### 2. Backend - Authentication Layer

**File:** `backend/src/middleware/auth.ts`

**What It Does:**
- Extracts JWT from `Authorization: Bearer <token>` header
- Decodes JWT to get: `userId`, `companyId`, `role`
- Sets `req.user` for downstream middleware

**Critical Code:**
```typescript
const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
req.user = decoded;  // Contains { userId, companyId, role }
```

**JWT Origin:** Created in `auth.service.ts` during login:
```typescript
const payload: JwtPayload = {
  userId: user.id,
  companyId: user.company_id,  // ← From database user record
  role: user.role,
};
```

### 3. Backend - Tenant Context Extraction

**File:** `backend/src/middleware/tenant.ts`

**What It Does:**
- Validates that JWT contains required fields (`companyId`, `userId`, `role`)
- Sets `req.tenantContext` for controllers
- Ensures all data operations are scoped to the authenticated user's company

**Critical Code:**
```typescript
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.companyId || !req.user.userId || !req.user.role) {
    return next(new UnauthorizedError('Tenant context missing from token'));
  }
  req.tenantContext = {
    companyId: req.user.companyId,  // ← From JWT (originally from database)
    userId: req.user.userId,
    role: req.user.role,
  };
  next();
};
```

### 4. Backend - Driver Controller

**File:** `backend/src/controllers/driver.controller.ts`

**What It Does:**
- Receives HTTP request with driver data
- Extracts company_id from `req.tenantContext` (set by tenant middleware)
- Passes to service layer

**Critical Code:**
```typescript
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await driverService.create(
      req.tenantContext!.companyId,  // ← From tenant middleware
      req.body                       // ← Form data (without company_id)
    );
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
};
```

### 5. Backend - Driver Service (UPDATED)

**File:** `backend/src/services/driver.service.ts`

**What It Does:**
- Validates required fields
- **NEW:** Validates that company exists in database
- Strips any client-supplied `company_id` from payload
- Injects authenticated `company_id`
- Returns to repository for database insertion

**Critical Code (NEW VALIDATION):**
```typescript
async create(companyId: string, data: any) {
  // Validate required fields
  const required = ['first_name', 'last_name', 'license_number'];
  for (const field of required) {
    if (!data[field] || !data[field].toString().trim()) {
      throw new ValidationError(`${field.replace(/_/g, ' ')} is required`);
    }
  }

  // NEW: Validate company exists
  const company = await db('companies').where('id', companyId).first();
  if (!company) {
    throw new ValidationError(
      `Company not found. Unable to create driver. Please contact your administrator.`,
      { companyId }
    );
  }

  // Validate email format if provided
  if (data.email && !this.isValidEmail(data.email)) {
    throw new ValidationError('Invalid email format');
  }

  const safeData = this.normalizeDriverData(companyId, data);
  return driverRepository.create(companyId, safeData);
}

private normalizeDriverData(companyId: string, data: any = {}) {
  const { company_id, ...safeData } = data;  // Strip client-supplied
  return {
    ...safeData,
    company_id: companyId,  // Force authenticated company
  };
}
```

### 6. Backend - Driver Repository

**File:** `backend/src/repositories/driver.repository.ts`

**What It Does:**
- Inserts driver record with `company_id` into database
- Database FK constraint validates `company_id` exists in `companies` table

**Critical Code:**
```typescript
async create(companyId: string, data: any) {
  const [driver] = await db('drivers')
    .insert({ ...data, company_id: companyId })  // ← company_id passed here
    .returning('*');
  return driver;
}
```

### 7. Database Schema

**Drivers Table Migration:** `backend/src/database/migrations/20240101000004_create_drivers.ts`

```typescript
table.uuid('company_id')
  .notNullable()
  .references('id')        // ← References companies table
  .inTable('companies')
  .onDelete('CASCADE');     // ← Cascading delete if company deleted
```

**Critical:** The FK constraint `drivers.company_id_foreign` validates that:
- `company_id` is NOT NULL
- `company_id` exists in `companies.id`

### 8. Database Seed Data

**File:** `backend/src/database/seeds/001_demo_data.ts`

**Creates:**
- 2 companies: "ABC Trucking LLC" and "XYZ Transport Inc"
- 6 users: Admins, dispatchers, drivers (all with valid `company_id`)
- 3 sample drivers (all with `company_id = comp1`)

**Login Credentials (after seed):**
```
Email: admin@example.com
Password: Password123!
Company: ABC Trucking LLC
```

---

## Problem Diagnosis

### Symptoms

| Symptom | Likely Cause |
|---------|--------------|
| ❌ `violates foreign key constraint "drivers_company_id_foreign"` | Database not seeded OR user doesn't have company_id |
| ❌ `Tenant context missing from token` | User logged in but JWT doesn't include companyId |
| ❌ `Invalid token` / `Token expired` | JWT signature invalid or token is malformed |
| ❌ `Company not found` (new error message) | User's company_id doesn't exist in companies table |
| ✅ Successful driver creation | All systems working correctly |

### Diagnostic Script

**Run:**
```bash
cd backend
npm run diagnose
```

**This script checks:**
1. ✅ Database connection
2. ✅ Companies table has data
3. ✅ Users have valid company_id
4. ✅ Sample login credentials
5. ✅ Current drivers (if any)

**Output Example (Success):**
```
📊 LoadMaster Database Diagnostics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Testing database connection...
✅ Database connection successful

✓ Checking companies table...
✅ Found 2 company/companies:
   - ABC Trucking LLC (id: 550e8400-e29b-41d4-a716-446655440000)
   - XYZ Transport Inc (id: 550e8400-e29b-41d4-a716-446655440001)

✓ Checking users table...
✅ Found 6 user(s):
   ✅ admin@example.com → Company: ABC Trucking LLC
   ✅ dispatcher@example.com → Company: ABC Trucking LLC
   ✅ john.smith@example.com → Company: ABC Trucking LLC
   ...

✓ Sample login credentials for testing:
   Email: admin@example.com
   Password: Password123!
   Company: ABC Trucking LLC
```

---

## Step-by-Step Fix

### Step 1: Ensure Database is Set Up

**1a. Check .env file has correct DATABASE_URL**

File: `backend/.env`
```
DATABASE_URL=postgresql://loadmaster:loadmaster@localhost:5433/loadmaster
```

**Ensure:**
- PostgreSQL is running
- Database `loadmaster` exists
- Credentials are correct

**1b. Create database if it doesn't exist**

```bash
# Using psql
createdb -U loadmaster loadmaster
```

### Step 2: Run Migrations

Migrations create all tables with correct schema:

```bash
cd backend
npm run migrate
```

**Output should show:**
```
✅ Migration complete: [ migrations run ]
```

### Step 3: Run Seeds

Seeds populate initial data (companies, users, roles):

```bash
cd backend
npm run seed
```

**This creates:**
- 2 companies
- 6 users (with valid company_id)
- 3 sample drivers
- Sample loads, trucks, brokers

### Step 4: Verify Database

Run diagnostics to confirm everything is set up:

```bash
npm run diagnose
```

**All checks should pass (✅)**

### Step 5: Test Complete Flow

**5a. Start Backend**
```bash
npm run dev
```

**5b. Start Frontend (in another terminal)**
```bash
cd frontend
npm run dev
```

**5c. Login**
- Email: `admin@example.com`
- Password: `Password123!`

**5d. Navigate to Drivers page**
- Click "Manage Drivers" or navigate to `/admin/drivers`

**5e. Create a Driver**
- Click "+ Add Driver"
- Fill in required fields: First Name, Last Name, License Number
- Click "Save"
- **Should succeed** ✅

**5f. Verify Results**
- Driver appears in list
- Dashboard "Drivers Added" stat updates automatically
- No database error

---

## What Changed

### Files Modified

1. **`backend/src/services/driver.service.ts`** - Added company existence validation
   - Validates required fields: `first_name`, `last_name`, `license_number`
   - **NEW:** Validates company exists in database
   - Validates email format if provided
   - Better error messages with validation details

2. **`backend/package.json`** - Added diagnostic script
   - Added `"diagnose": "tsx diagnose-db.ts"` to npm scripts

### Files Created

1. **`backend/diagnose-db.ts`** - Database diagnostic utility
   - Checks database connectivity
   - Verifies companies table has data
   - Verifies users have valid company_id
   - Provides sample login credentials
   - Helps identify configuration issues

### No Changes Required

- ❌ Frontend code (already correct)
- ❌ Database migrations (already correct)
- ❌ Auth flow (already correct)
- ❌ Repository layer (already correct)

---

## Testing Checklist

- [ ] Database created and PostgreSQL running
- [ ] `npm run migrate` succeeds
- [ ] `npm run seed` succeeds
- [ ] `npm run diagnose` shows all green (✅)
- [ ] Backend starts: `npm run dev`
- [ ] Frontend starts: `npm run dev`
- [ ] Can login with admin@example.com / Password123!
- [ ] Can create driver without FK error
- [ ] Driver appears in list
- [ ] Dashboard updates automatically
- [ ] Can edit driver
- [ ] Can delete driver

---

## Troubleshooting

### Error: "Company not found"

**Cause:** User's company_id in JWT doesn't exist in companies table

**Fix:**
```bash
npm run seed
```

### Error: "Tenant context missing from token"

**Cause:** JWT doesn't include companyId (user doesn't have valid company_id in database)

**Fix:**
1. Check user record in database has non-null `company_id`
2. Re-login after fixing user record

### Error: "violates foreign key constraint"

**Cause:** Database not migrated or seeded

**Fix:**
```bash
npm run migrate
npm run seed
```

### Error: "Database connection failed"

**Cause:** PostgreSQL not running or wrong DATABASE_URL

**Fix:**
1. Check `backend/.env` DATABASE_URL
2. Ensure PostgreSQL is running: `psql -U loadmaster`
3. Create database if needed: `createdb loadmaster`

---

## Key Concepts

### Why company_id is enforced

- **Multi-tenancy:** Each company owns only their data
- **Security:** Users cannot access other companies' data
- **Data Isolation:** Queries always filter by company_id
- **FK Constraint:** Database enforces referential integrity

### Why company_id comes from JWT, not form

- **Prevents cheating:** Client can't claim to be a different company
- **Authentication:** JWT is signed; client can't modify it
- **Atomic:** Same company_id used throughout request
- **Audit trail:** We always know which company created each record

### Field Name Convention

- Frontend → Backend: `first_name` (snake_case)
- Database: `first_name` (snake_case)
- JWT: `companyId` (camelCase, differs for backward compatibility)

---

## Performance Notes

- Company validation (new) adds one database query
- Validation happens before insertion (fail fast)
- Index on `companies.id` ensures lookup is O(1)
- FK constraint check is built-in to PostgreSQL

---

## Next Steps

1. **Verify database:** `npm run diagnose`
2. **Test driver creation:** Login and try adding a driver
3. **Monitor logs:** Check backend console for errors
4. **Dashboard refresh:** Verify automatic update without page reload
5. **Edit/Delete drivers:** Test full CRUD operations

---

## Support

If issues persist:

1. Run `npm run diagnose` and share output
2. Check backend logs for detailed error messages
3. Verify PostgreSQL is running: `pg_isready -h localhost -p 5433`
4. Check `.env` DATABASE_URL matches your setup
5. Ensure JWT contains companyId: Login and check backend logs
