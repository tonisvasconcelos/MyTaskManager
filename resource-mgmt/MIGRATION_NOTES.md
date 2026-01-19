# Database Migration Notes

## Language Support Implementation

A new `language` field has been added to the `User` model in Prisma schema to support dual language (EN/PT-BR).

## Billable Field Implementation

A new `billable` field has been added to the `Task` model in Prisma schema to track whether tasks are billable or non-billable.

### Migration Steps

1. **Run Prisma migration:**
   ```bash
   cd resource-mgmt/apps/api
   npx prisma migrate dev --name add_user_language
   ```

2. **Or generate migration without applying:**
   ```bash
   npx prisma migrate dev --create-only --name add_user_language
   ```

3. **For production, apply the migration:**
   ```bash
   npx prisma migrate deploy
   ```

### Schema Changes

- Added `UserLanguage` enum with values: `EN`, `PT_BR`
- Added `language` field to `User` model with default value `EN`

### API Changes

- Updated `/auth/login` endpoint to return user language
- Updated `/auth/me` endpoint to return user language
- Updated admin user creation/update endpoints to accept language field
- Updated validators to accept `language` field (optional, defaults to 'EN')

### Frontend Changes

- Added i18next configuration with EN and PT-BR translations
- Added language toggle in AppShell navigation sidebar
- All pages and components now use translation keys
- Language preference is stored in localStorage and persists across sessions

### Notes

- Existing users will default to `EN` language
- Language can be changed via the sidebar toggle (persists to localStorage)
- Admin can set default language when creating/editing users
- User language preference can be synced with backend in future updates

### Schema Changes (Billable)

- Added `TaskBillable` enum with values: `Billable`, `NonBillable`
- Added `billable` field to `Task` model with default value `Billable`

### API Changes (Billable)

- Updated task creation/update endpoints to accept `billable` field
- Updated validators to accept `billable` field (optional, defaults to 'Billable')

### Frontend Changes (Billable)

- Added billable field to task creation forms (ProjectDetailPage, TaskDetailModal)
- Added billable field to task edit forms (TaskDetailModal)
- Added billable badge to all task displays:
  - DashboardPage (task list)
  - ProjectDetailPage (Kanban board)
  - OngoingTasksPage (task list)
  - TaskDetailModal (task details view)
- Added translations for "Billable" and "Non-Billable" in both EN and PT-BR

### Notes (Billable)

- Existing tasks will default to `Billable` when migration is run
- Billable field is visible in all task creation and editing forms
- Billable status is displayed as a badge in all task list views
