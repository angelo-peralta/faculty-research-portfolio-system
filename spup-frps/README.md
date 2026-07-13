# SPUP Faculty Research Portfolio

The **SPUP Faculty Research Portfolio (SPUP FRP)** is an installable web application for managing faculty profiles, academic qualifications, research, publications, engagements, and institutional reporting at St. Paul University Philippines.

The system provides role-based faculty and administrative workspaces, Microsoft Entra ID authentication, portfolio analytics, notifications, exports, and responsive progressive web app support.

## Features

- Faculty portfolio management for profiles, education, publications, engagements, and research records
- Administrative dashboards for faculty, department, publication, engagement, and research oversight
- Portfolio analytics and configurable compliance decision support
- Microsoft Entra ID sign-in with faculty, secondary administrator, and main administrator roles
- Faculty invitations, account access management, and administrative broadcasts
- CSV and JSON data exports
- OpenAlex-assisted publication lookup
- In-app and web push notifications
- Responsive, installable progressive web app experience

## Technology Stack

| Area | Technologies |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Interface | Tailwind CSS 4, Radix UI, Recharts |
| Data and validation | MySQL 8, `mysql2`, Zod, TanStack Query |
| Authentication | Microsoft Entra ID OAuth 2.0 |
| Platform features | Progressive Web App, Web Push, Vercel Analytics, Speed Insights |

## Prerequisites

- Node.js 20.9 or newer
- npm 11 (the repository currently targets npm 11.7.0)
- MySQL 8
- A Microsoft Entra ID app registration

`mysqldump` is also required when using the MySQL backup script.

## Getting Started

### 1. Install dependencies

```powershell
npm ci
```

### 2. Configure the environment

Create a local environment file from the provided template:

```powershell
Copy-Item .env.example .env.local
```

Update `.env.local` with the values for your environment. The main configuration groups are:

| Configuration | Variables |
| --- | --- |
| Application URLs | `NEXT_PUBLIC_APP_ORIGIN`, `NEXT_PUBLIC_SITE_URL` |
| Microsoft Entra ID | `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`, `AZURE_AD_REDIRECT_URI` |
| MySQL | `DATABASE_URL`, `MYSQL_CONNECTION_LIMIT` |
| Initial administrator | `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME` |
| Push notifications | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| Distributed rate limiting | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Publication lookup | `OPENALEX_API_BASE_URL` |

The template documents which settings are optional. Never commit `.env.local`, import credentials, or other secrets.

### 3. Prepare MySQL

Create the database and a dedicated application user. Replace the sample password before running these statements:

```sql
CREATE DATABASE frp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'frp_user'@'%' IDENTIFIED BY 'change-this-password';
GRANT ALL PRIVILEGES ON frp.* TO 'frp_user'@'%';
FLUSH PRIVILEGES;
```

Make sure `DATABASE_URL` points to this database.

### 4. Configure Microsoft Entra ID

In the Entra app registration, add a **Web** redirect URI that exactly matches `AZURE_AD_REDIRECT_URI`.

For local development, the default callback is:

```text
http://localhost:3000/auth/callback
```

Use the corresponding HTTPS callback for a deployed environment.

### 5. Initialize and run the application

```powershell
npm run migrate
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If the initial administrator has not signed in before, the seed command creates a pending invitation that is linked automatically after Microsoft sign-in.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint across the project |
| `npm run typecheck` | Run TypeScript checks without emitting files |
| `npm run migrate` | Apply pending MySQL schema migrations |
| `npm run seed` | Create or update the initial main administrator invitation |
| `npm run import:supabase` | Merge supported data from a Supabase source into MySQL |
| `npm run import:supabase:replace` | Replace MySQL application data from a Supabase source |
| `npm run import:supabase-files` | Download referenced Supabase faculty assets |
| `npm run import:supabase-files:dry-run` | Preview the faculty asset import without writing files |
| `npm run backup:mysql` | Create a MySQL SQL backup in `data/mysql-backups` |

For data migration, asset transfer, backup, and verification details, see [MIGRATION.md](MIGRATION.md).

## Project Structure

```text
app/          Next.js pages, layouts, and API route handlers
components/   Faculty, administrator, layout, PWA, and UI components
hooks/        Shared React hooks
lib/          Database, authentication, services, queries, and domain logic
migrations/   Versioned MySQL schema migrations
public/       Static assets, icons, service worker, and local faculty uploads
scripts/      Migration, seeding, import, backup, and audit utilities
styles/       Shared global styling
```

## Verification

Before deploying a change, run:

```powershell
npm run typecheck
npm run lint
npm run build
```

Then manually verify Microsoft sign-in, role access, faculty record management, administrative reports, exports, and file uploads.

## Deployment Notes

- Configure production environment variables before building and running the app.
- Register the production `/auth/callback` URL in Microsoft Entra ID and keep it identical to `AZURE_AD_REDIRECT_URI`.
- Run database migrations against the production MySQL database before serving application traffic.
- Faculty uploads are written to `public/uploads/faculty-assets`; production hosting must provide a persistent, writable filesystem and include this directory in backups.
- Configure Upstash Redis for distributed rate limiting when the application runs across multiple processes or instances.

## License

Copyright © 2025–2026 Angelo Pambid Peralta. All rights reserved.

This project is proprietary software registered with the Intellectual
Property Office of the Philippines under Copyright Registration
Certificate No. 2026-04854-N.

St. Paul University Philippines is authorized to use the software for
approved internal institutional purposes. Copying, redistribution,
commercial use, external deployment, or disclosure of the source code
requires prior written permission from the copyright owner.

See the [LICENSE](LICENSE.md) file for the complete terms.
