# Procurement Module - Verification Checklist

## Expected Features

### 1. Navigation Menu
- **Location**: Left sidebar
- **Label**: "Procurements" (💰 icon)
- **Path**: `/procurements`
- **Should appear**: After login, in the navigation list

### 2. Procurements Page
- **URL**: `/procurements`
- **Features**:
  - List of all expenses
  - Search bar (by invoice number or vendor name)
  - "Create Expense" button (top right)
  - Each expense card shows:
    - Invoice number
    - Vendor (company name)
    - Date
    - Total amount
    - Allocated to projects (sum)
    - Payment status badge
    - Payment method badge
    - Edit button
    - Delete button
  - Pagination at bottom

### 3. Project Detail Page - Expenses Tab
- **Location**: Project detail page (`/projects/:id`)
- **Tab**: "Expenses" (third tab after Tasks and Timesheet)
- **Features**:
  - Total allocated amount for the project
  - List of expenses allocated to this project
  - Shows allocation amount (not full expense amount)

---

## Troubleshooting Steps

### Step 1: Verify Code is Deployed
1. Check if you're running the latest code:
   ```bash
   git log --oneline -5
   ```
   Should see commits: "Add IT Procurement module..." and "Fix TypeScript errors..."

2. If using GitHub Pages, check if the deployment succeeded:
   - Go to GitHub Actions tab
   - Verify the latest workflow run completed successfully

### Step 2: Clear Browser Cache
1. Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Or clear browser cache completely
3. Or open in incognito/private window

### Step 3: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any errors (red messages)
4. Common issues:
   - 404 errors for `/procurements` route
   - Translation key errors
   - API endpoint errors

### Step 4: Verify Navigation Link
1. After logging in, check the left sidebar
2. Look for "Procurements" with 💰 icon
3. It should be the last item in the navigation list
4. If not visible:
   - Check if sidebar is collapsed (icon only)
   - Hover over icons to see tooltips
   - Check browser console for errors

### Step 5: Test Direct URL Access
1. While logged in, try navigating directly to:
   ```
   http://your-app-url/procurements
   ```
2. If it redirects to login, authentication might be the issue
3. If you see a blank page, check console for errors

### Step 6: Verify API Endpoints
1. Open browser DevTools → Network tab
2. Navigate to `/procurements` page
3. Look for API calls to:
   - `GET /api/procurements`
4. Check response:
   - Should return 200 OK
   - Should return paginated data structure
   - If 401/403, authentication issue
   - If 404, route not registered

### Step 7: Check Translation Keys
1. Open browser console
2. Type: `localStorage.getItem('i18nextLng')` (check current language)
3. Verify translation file has `common.procurements` key
4. If missing, the navigation label might be blank

### Step 8: Verify Project Expenses Tab
1. Go to any project detail page: `/projects/:id`
2. Look for three tabs: "Tasks", "Timesheet Summary", "Expenses"
3. Click on "Expenses" tab
4. Should show:
   - Total allocated amount
   - List of expenses (if any)
   - Or "No expenses allocated to this project"

---

## Quick Verification Commands

### Check if files exist:
```bash
# Backend
ls resource-mgmt/apps/api/src/routes/procurements.ts
ls resource-mgmt/apps/api/src/controllers/procurements.ts
ls resource-mgmt/apps/api/src/repositories/procurements.ts

# Frontend
ls resource-mgmt/apps/web/src/pages/ProcurementsPage.tsx
ls resource-mgmt/apps/web/src/components/procurements/ProcurementFormModal.tsx
```

### Check if route is registered:
```bash
grep -r "procurements" resource-mgmt/apps/web/src/app/router.tsx
grep -r "procurements" resource-mgmt/apps/web/src/components/layout/AppShell.tsx
```

### Check if API route is registered:
```bash
grep -r "procurements" resource-mgmt/apps/api/src/app.ts
```

---

## Common Issues & Solutions

### Issue 1: Navigation link not showing
**Possible causes:**
- Translation key missing
- Sidebar collapsed (check icon tooltip)
- Browser cache

**Solution:**
- Hard refresh browser
- Check translation files have `common.procurements`
- Expand sidebar if collapsed

### Issue 2: Page shows 404
**Possible causes:**
- Route not registered
- Build not updated
- Deployment failed

**Solution:**
- Verify router.tsx has `/procurements` route
- Rebuild frontend: `npm run build` in `apps/web`
- Check deployment logs

### Issue 3: API returns 404
**Possible causes:**
- Backend route not registered
- Backend not restarted
- Migration not run

**Solution:**
- Verify `app.ts` has `procurementsRouter`
- Restart backend server
- Run migration: `npm run db:migrate` in `apps/api`

### Issue 4: Expenses tab not showing
**Possible causes:**
- ProjectDetailPage not updated
- Tab state not initialized

**Solution:**
- Verify ProjectDetailPage has expenses tab
- Check activeTab state includes 'expenses'

### Issue 5: Create/Edit buttons not showing
**Possible causes:**
- `canMutate` is false
- Role-based hiding (should show for all currently)

**Solution:**
- Check ProcurementsPage has `canMutate = true`
- Verify buttons are inside `{canMutate && ...}` block

---

## Manual Testing Checklist

- [ ] Navigation shows "Procurements" link
- [ ] Can navigate to `/procurements` page
- [ ] Page loads without errors
- [ ] "Create Expense" button is visible
- [ ] Can open create expense modal
- [ ] Can select vendor/company
- [ ] Can add allocations to projects
- [ ] Form validation works (sum must equal total)
- [ ] Can save expense
- [ ] Expense appears in list
- [ ] Can edit expense
- [ ] Can delete expense
- [ ] Search works (by invoice or vendor)
- [ ] Pagination works
- [ ] Project detail page shows "Expenses" tab
- [ ] Expenses tab shows allocated expenses
- [ ] Total allocated amount is correct

---

## If Still Not Working

1. **Check Git Status:**
   ```bash
   git status
   git log --oneline -3
   ```

2. **Verify All Files Committed:**
   ```bash
   git diff HEAD
   ```

3. **Check if Running Locally:**
   - If running `npm run dev`, restart the dev server
   - Clear `.vite` cache if using Vite

4. **Check if Deployed:**
   - Verify GitHub Actions deployment succeeded
   - Check deployment URL is correct
   - Verify environment variables are set

5. **Browser DevTools:**
   - Check Console for errors
   - Check Network tab for failed requests
   - Check Application/Storage for cached data

---

## Expected API Endpoints

When working correctly, these endpoints should be available:

- `GET /api/procurements` - List expenses (paginated)
- `GET /api/procurements/:id` - Get single expense
- `POST /api/procurements` - Create expense (Admin/Manager only)
- `PUT /api/procurements/:id` - Update expense (Admin/Manager only)
- `DELETE /api/procurements/:id` - Delete expense (Admin/Manager only)
- `GET /api/projects/:id/expenses` - Get expenses for a project

Test these endpoints directly (with authentication) to verify backend is working.
