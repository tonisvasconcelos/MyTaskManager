# Railway Database Migration Instructions

## Problem
The database schema is missing the `Payment` and `Sale` tables, causing 500 errors on the Project Financial Entries page.

## Solution: Run Migration on Railway

### Option 1: Using Railway CLI (Recommended)

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project**:
   ```bash
   cd resource-mgmt
   railway link
   ```
   Select your Railway project when prompted.

4. **Run the migration**:
   ```bash
   cd apps/api
   railway run npx prisma migrate deploy
   ```

   Or use the provided script:
   ```bash
   railway run bash railway-migrate.sh
   ```

### Option 2: Using Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Click on your API service
4. Go to the **"Deployments"** tab or use the **"Shell"** option
5. Run the following command:
   ```bash
   cd resource-mgmt/apps/api && npx prisma migrate deploy
   ```

### Option 3: Automatic on Next Deployment

The `nixpacks.toml` file is already configured to run migrations automatically on startup:
```toml
[start]
cmd = "cd apps/api && npx prisma migrate deploy && npx prisma generate && node dist/server.js"
```

However, **migration files need to exist first**. If migration files don't exist, you'll need to:

1. Create migration files locally (requires database access):
   ```bash
   cd resource-mgmt/apps/api
   npx prisma migrate dev --name add_payments_and_sales
   ```

2. Commit and push the migration files to GitHub

3. Railway will automatically run them on the next deployment

## Verify Migration Success

After running the migration, verify it worked by:

1. Check Railway logs for "Migration complete" message
2. Test the Project Financial Entries page - it should no longer show 500 errors
3. Check that Payment and Sale tables exist in your database

## Troubleshooting

If you get errors about missing migration files:
- The migration files need to be created first using `prisma migrate dev`
- Or use `prisma db push` as a temporary workaround (not recommended for production)

If you get connection errors:
- Verify your `DATABASE_URL` environment variable is set correctly in Railway
- Check that your database (Neon) is accessible
