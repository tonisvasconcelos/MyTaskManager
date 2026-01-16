# Resource Management System MVP

A production-quality MVP for managing IT projects, tasks, and timesheets with a modern dark-mode UI inspired by Strava.

## Tech Stack

- **Frontend**: React + TypeScript (Vite), TailwindCSS, React Router, TanStack Query, React Hook Form + Zod
- **Backend**: Node.js + TypeScript, Express, PostgreSQL, Prisma ORM, Multer
- **Monorepo**: npm workspaces

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose (for PostgreSQL)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start PostgreSQL:**
   ```bash
   docker-compose up -d
   ```

3. **Set up environment variables:**
   ```bash
   cd apps/api
   cp .env.example .env
   # Edit .env with your DATABASE_URL
   # For Neon PostgreSQL, use format:
   # DATABASE_URL="postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require"
   ```

4. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Seed demo data:**
   ```bash
   npm run db:seed
   ```

6. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - API server on `http://localhost:4000`
   - Web app on `http://localhost:5173` (or next available port)

## Project Structure

```
resource-mgmt/
├── apps/
│   ├── api/          # Express + Prisma backend
│   └── web/          # React + Vite frontend
├── docker-compose.yml
└── package.json
```

## Available Scripts

- `npm run dev` - Start both API and web dev servers
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with demo data
- `npm run build` - Build both apps for production

## Features

- **Companies Management**: Create, edit, and manage customer/company information
- **Projects**: Track IT projects with status, dates, and company association
- **Tasks (Kanban)**: Visual kanban board for task management with priorities, assignees, and status tracking
- **Task Attachments**: Upload and manage multiple images per task
- **Timesheet**: Log time entries per task with weekly summaries and daily/hourly totals
- **Ongoing Tasks**: Global view of all in-progress and blocked tasks
- **Dashboard**: Overview with KPIs and quick access to ongoing tasks

## Screenshots

_(Placeholder for screenshots)_

## Development

### Backend (apps/api)

- API runs on port 4000
- Prisma migrations in `prisma/migrations/`
- Uploads stored in `apps/api/uploads/` directory
- All API endpoints are prefixed with `/api`
- Image uploads are served statically at `/uploads/<filename>`

### Frontend (apps/web)

- Vite dev server with HMR (port 5173)
- Dark mode UI with Strava-inspired design
- TanStack Query for data fetching and caching
- React Hook Form + Zod for form validation
- Debounced search on list pages
- Pagination for all list views

## License

Private project
