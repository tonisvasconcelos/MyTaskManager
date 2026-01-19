# IT Procurement Module - Test Plan

## Overview
This document outlines all tests that should be written for the IT Procurement module, covering backend API, frontend components, and integration scenarios.

---

## Backend API Tests

### 1. Validators (`src/validators/procurements.ts`)

#### `createProcurementSchema`
- ✅ Valid request with valid data passes validation
- ✅ Missing required fields (companyId, invoiceNumber, date, totalAmount, paymentMethod) fails
- ✅ Invalid UUID for companyId fails
- ✅ Invalid UUID for projectId in allocations fails
- ✅ Empty allocations array fails
- ✅ Duplicate projectIds in allocations fails
- ✅ Sum of allocations not equal to totalAmount fails
- ✅ Negative totalAmount fails
- ✅ Negative allocatedAmount fails
- ✅ Zero totalAmount fails
- ✅ Invalid paymentMethod enum value fails
- ✅ Invalid paymentStatus enum value fails
- ✅ Valid date string formats (YYYY-MM-DD, ISO datetime) pass
- ✅ Invalid date format fails
- ✅ Floating point precision handling (0.01 tolerance)

#### `updateProcurementSchema`
- ✅ All create validations apply
- ✅ Partial updates (only some fields) pass
- ✅ Updating allocations without totalAmount fails validation
- ✅ Updating totalAmount without allocations passes (if allocations unchanged)
- ✅ Invalid expense ID (UUID format) fails

#### `getProcurementSchema` & `deleteProcurementSchema`
- ✅ Valid UUID passes
- ✅ Invalid UUID format fails

---

### 2. Repository Tests (`src/repositories/procurements.ts`)

#### `findProcurements`
- ✅ Returns paginated results
- ✅ Filters by tenantId correctly
- ✅ Search by invoice number works
- ✅ Search by company name works (case-insensitive)
- ✅ Filter by projectId returns only expenses allocated to that project
- ✅ Returns correct total count
- ✅ Handles empty results
- ✅ Orders by createdAt desc
- ✅ Includes company relation
- ✅ Includes allocations with project relation

#### `findProcurementByIdForTenant`
- ✅ Returns expense for valid tenant and ID
- ✅ Returns null for non-existent expense
- ✅ Returns null for expense belonging to different tenant
- ✅ Includes all relations (company, allocations, projects)

#### `createProcurement`
- ✅ Creates expense with all fields
- ✅ Creates allocations in transaction
- ✅ Transaction rolls back if allocation creation fails
- ✅ Handles Decimal conversion correctly
- ✅ Sets default status to PENDING if not provided
- ✅ Enforces unique constraint (tenantId + companyId + invoiceNumber)
- ✅ Returns expense with relations

#### `updateProcurement`
- ✅ Updates expense fields
- ✅ Replaces allocations (deletes old, creates new) in transaction
- ✅ Transaction rolls back on failure
- ✅ Handles partial updates
- ✅ Updates companyId correctly
- ✅ Handles empty allocations array
- ✅ Returns updated expense with relations

#### `deleteProcurement`
- ✅ Deletes expense
- ✅ Cascades to allocations (verified)
- ✅ Handles non-existent expense gracefully

#### `findExpensesByProject`
- ✅ Returns only expenses allocated to specified project
- ✅ Filters by tenantId
- ✅ Returns correct allocation amount for the project
- ✅ Orders by date desc
- ✅ Handles project with no expenses

---

### 3. Controller Tests (`src/controllers/procurements.ts`)

#### `getProcurements`
- ✅ Returns paginated list
- ✅ Applies search filter
- ✅ Applies projectId filter
- ✅ Handles errors and passes to error handler
- ✅ Uses correct tenantId from request

#### `getProcurement`
- ✅ Returns expense for valid ID
- ✅ Returns 404 for non-existent expense
- ✅ Returns 404 for expense from different tenant
- ✅ Handles errors correctly

#### `createProcurement`
- ✅ Creates expense successfully (201)
- ✅ Validates company belongs to tenant
- ✅ Validates all projects belong to tenant
- ✅ Returns 404 if company not found
- ✅ Returns 404 if project not found
- ✅ Validates allocation sum equals totalAmount
- ✅ Handles validation errors
- ✅ Handles database errors (unique constraint violations)

#### `updateProcurement`
- ✅ Updates expense successfully
- ✅ Returns 404 if expense not found
- ✅ Returns 404 if expense belongs to different tenant
- ✅ Validates company belongs to tenant (if updated)
- ✅ Validates projects belong to tenant (if allocations updated)
- ✅ Handles partial updates
- ✅ Handles errors correctly

#### `deleteProcurement`
- ✅ Deletes expense successfully (204)
- ✅ Returns 404 if expense not found
- ✅ Returns 404 if expense belongs to different tenant
- ✅ Handles errors correctly

---

### 4. Middleware Tests (`src/middlewares/requireRole.ts`)

#### `requireAdminOrManager`
- ✅ Allows Admin role
- ✅ Allows Manager role
- ✅ Blocks Contributor role (403)
- ✅ Blocks unauthenticated requests
- ✅ Returns ValidationError with correct message

---

### 5. Route Tests (`src/routes/procurements.ts`)

#### Route Protection
- ✅ GET `/api/procurements` - accessible to all authenticated users
- ✅ GET `/api/procurements/:id` - accessible to all authenticated users
- ✅ POST `/api/procurements` - requires Admin/Manager (403 for Contributor)
- ✅ PUT `/api/procurements/:id` - requires Admin/Manager (403 for Contributor)
- ✅ DELETE `/api/procurements/:id` - requires Admin/Manager (403 for Contributor)

#### Route Integration
- ✅ All routes use requireTenantAuth middleware
- ✅ Validation middleware applied correctly
- ✅ Error handler catches all errors

---

### 6. Project Expenses Endpoint (`src/controllers/projects.ts`)

#### `getProjectExpenses`
- ✅ Returns expenses for valid project
- ✅ Returns 404 if project not found
- ✅ Returns 404 if project belongs to different tenant
- ✅ Returns empty array if no expenses
- ✅ Returns only allocations for the specified project
- ✅ Handles errors correctly

---

## Frontend Component Tests

### 7. API Hooks Tests (`src/shared/api/procurements.ts`)

#### `useProcurements`
- ✅ Fetches paginated list when no projectId
- ✅ Fetches project expenses when projectId provided
- ✅ Handles search parameter
- ✅ Handles pagination parameters
- ✅ Invalidates cache on mutations
- ✅ Handles loading state
- ✅ Handles error state

#### `useProcurement`
- ✅ Fetches single expense
- ✅ Only fetches when ID provided (enabled: !!id)
- ✅ Handles loading and error states

#### `useCreateProcurement`
- ✅ Creates expense successfully
- ✅ Invalidates procurements list cache
- ✅ Invalidates project expenses cache for allocated projects
- ✅ Handles error state
- ✅ Handles loading state

#### `useUpdateProcurement`
- ✅ Updates expense successfully
- ✅ Invalidates relevant caches
- ✅ Invalidates project expenses for affected projects
- ✅ Handles error state

#### `useDeleteProcurement`
- ✅ Deletes expense successfully
- ✅ Invalidates all procurement caches
- ✅ Handles error state

---

### 8. Component Tests

#### `ProcurementsPage`
- ✅ Renders list of expenses
- ✅ Shows loading skeleton
- ✅ Shows empty state when no expenses
- ✅ Search input filters results
- ✅ Pagination works correctly
- ✅ Create button opens modal (if canMutate)
- ✅ Edit button opens modal with expense data
- ✅ Delete button shows confirmation and deletes
- ✅ Renders expense details correctly (invoice, vendor, date, amounts, status)
- ✅ Badges show correct colors for payment status
- ✅ Calculates total allocated correctly
- ✅ Hides create/edit/delete buttons for Contributors (role-based)

#### `ProcurementFormModal`
- ✅ Renders all form fields
- ✅ Company select shows all companies
- ✅ "Add new company" button opens CompanyQuickCreateModal
- ✅ Date input works correctly
- ✅ Total amount input accepts decimals
- ✅ Payment method select works
- ✅ Payment status select works
- ✅ Dynamic allocations array:
  - ✅ Add allocation button adds new row
  - ✅ Remove allocation button removes row (min 1)
  - ✅ Project select shows all projects
  - ✅ Allocated amount input accepts decimals
  - ✅ Shows sum of allocations
  - ✅ Shows remaining amount
  - ✅ Highlights remaining in red if not zero
- ✅ Form validation:
  - ✅ Required fields show errors
  - ✅ Allocation sum must equal total amount
  - ✅ No duplicate projects
  - ✅ Positive amounts only
- ✅ Submit creates new expense
- ✅ Submit updates existing expense
- ✅ Pre-fills form when editing
- ✅ Closes modal on success
- ✅ Resets form on close
- ✅ Handles API errors

#### `CompanyQuickCreateModal`
- ✅ Renders form fields (name, email, phone)
- ✅ Name is required
- ✅ Email validation
- ✅ Creates company on submit
- ✅ Refreshes companies list
- ✅ Selects new company in parent form
- ✅ Closes modal on success
- ✅ Handles errors

---

### 9. Integration Tests

#### Project Detail Page - Expenses Tab
- ✅ Renders expenses tab
- ✅ Shows total allocated amount
- ✅ Lists all expenses allocated to project
- ✅ Shows correct allocation amount (not full expense amount)
- ✅ Shows expense details (invoice, vendor, date, status)
- ✅ Handles empty state
- ✅ Updates when expense is created/updated/deleted

---

## End-to-End (E2E) Tests

### 10. User Flows

#### Admin/Manager Flow
1. ✅ Navigate to Procurements page
2. ✅ Create new expense:
   - Select vendor (or create new)
   - Enter invoice details
   - Allocate to multiple projects
   - Verify sum equals total
   - Submit successfully
3. ✅ View expense in list
4. ✅ Edit expense:
   - Modify allocations
   - Update payment status
   - Save changes
5. ✅ Delete expense with confirmation
6. ✅ View expenses on project detail page
7. ✅ Verify total allocated on project

#### Contributor Flow
1. ✅ Navigate to Procurements page
2. ✅ View expenses list (read-only)
3. ✅ No create/edit/delete buttons visible
4. ✅ View expenses on project detail page
5. ✅ Attempting direct API calls to create/edit/delete returns 403

#### Search and Filter
1. ✅ Search by invoice number
2. ✅ Search by vendor name
3. ✅ Filter by project (via project detail page)
4. ✅ Pagination works correctly

#### Validation Scenarios
1. ✅ Create expense with allocation sum != total (should fail)
2. ✅ Create expense with duplicate projects (should fail)
3. ✅ Create expense with invalid company (should fail)
4. ✅ Create expense with invalid project (should fail)
5. ✅ Create expense with negative amounts (should fail)

---

## Database Tests

### 11. Schema and Constraints
- ✅ Unique constraint: (tenantId, companyId, invoiceNumber)
- ✅ Foreign key constraints work correctly
- ✅ Cascade deletes work (expense → allocations)
- ✅ Decimal precision (10,2) for amounts
- ✅ Indexes exist and improve query performance

---

## Performance Tests

### 12. Performance Scenarios
- ✅ List endpoint handles 1000+ expenses with pagination
- ✅ Search is performant with large datasets
- ✅ Project expenses query is optimized
- ✅ Transaction handling doesn't cause deadlocks

---

## Security Tests

### 13. Security Scenarios
- ✅ Tenant isolation: users can't see other tenants' expenses
- ✅ Role-based access: Contributors can't mutate
- ✅ Input sanitization: XSS prevention
- ✅ SQL injection prevention (Prisma parameterized queries)
- ✅ JWT token validation
- ✅ Company/project ownership validation

---

## Edge Cases

### 14. Edge Cases
- ✅ Very large amounts (9999999999.99)
- ✅ Very small amounts (0.01)
- ✅ Many allocations (10+ projects)
- ✅ Special characters in invoice number
- ✅ Long notes text
- ✅ Concurrent updates to same expense
- ✅ Deleting company that has expenses (should cascade or block)
- ✅ Deleting project with allocations (should be handled)

---

## Test Implementation Recommendations

### Backend Testing Stack
- **Framework**: Jest or Vitest
- **HTTP Testing**: Supertest
- **Database**: Test database with Prisma migrations
- **Mocking**: Prisma client mocking or test database

### Frontend Testing Stack
- **Framework**: Vitest (already in Vite project)
- **Component Testing**: React Testing Library
- **API Mocking**: MSW (Mock Service Worker)
- **E2E**: Playwright or Cypress

### Test Structure
```
resource-mgmt/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── __tests__/
│   │       │   ├── controllers/
│   │       │   │   └── procurements.test.ts
│   │       │   ├── repositories/
│   │       │   │   └── procurements.test.ts
│   │       │   ├── validators/
│   │       │   │   └── procurements.test.ts
│   │       │   └── middlewares/
│   │       │       └── requireRole.test.ts
│   │       └── routes/
│   │           └── procurements.test.ts
│   └── web/
│       └── src/
│           ├── __tests__/
│           │   ├── components/
│           │   │   └── procurements/
│           │   │       ├── ProcurementFormModal.test.tsx
│           │   │       └── CompanyQuickCreateModal.test.tsx
│           │   ├── pages/
│           │   │   └── ProcurementsPage.test.tsx
│           │   └── shared/
│           │       └── api/
│           │           └── procurements.test.ts
│           └── e2e/
│               └── procurements.spec.ts
```

---

## Priority Levels

### High Priority (Must Have)
- Backend validators (allocation sum, duplicate projects)
- Repository transaction handling
- Controller tenant isolation
- Role-based middleware
- Frontend form validation
- Basic CRUD operations

### Medium Priority (Should Have)
- Search functionality
- Pagination
- Project expenses endpoint
- Component rendering tests
- API hook tests

### Low Priority (Nice to Have)
- Performance tests
- E2E tests
- Edge case coverage
- Visual regression tests

---

## Notes
- Currently, no test infrastructure is set up in the project
- Consider setting up testing framework before implementing tests
- Start with high-priority backend tests (validators, repositories)
- Frontend tests can use MSW to mock API responses
- E2E tests should use a test database or mock API
