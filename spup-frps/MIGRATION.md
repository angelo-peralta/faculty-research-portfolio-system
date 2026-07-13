# MySQL Migration Runbook

This project now uses Microsoft Entra ID for sign-in and vanilla MySQL with raw SQL for all app data. Prisma, Postgres, and runtime Supabase clients are no longer part of the app.

## 1. Configure the App

Create or update `.env.local` with the new runtime values:

```env
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

AZURE_AD_CLIENT_ID=your-application-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_REDIRECT_URI=http://localhost:3000/auth/callback

DATABASE_URL=mysql://frp_user:frp_password@127.0.0.1:3306/frp
MYSQL_CONNECTION_LIMIT=10

INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_NAME="Main Administrator"
```

Create the database and grant a dedicated user before running migrations:

```sql
CREATE DATABASE frp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'frp_user'@'%' IDENTIFIED BY 'change-this-password';
GRANT ALL PRIVILEGES ON frp.* TO 'frp_user'@'%';
FLUSH PRIVILEGES;
```

Register the same callback in Microsoft Entra ID:

- App registrations -> your app -> Authentication.
- Add a Web redirect URI: `http://localhost:3000/auth/callback`.
- For production, add the deployed equivalent, for example `https://your-domain.com/auth/callback`, and set `AZURE_AD_REDIRECT_URI` to that exact value.

If Microsoft shows "Selected user account does not exist in tenant", the account you chose is not allowed by the app registration's tenant settings. Pick one:

- Keep the app single-tenant: sign in with an account that belongs to that tenant, or invite your account in Microsoft Entra ID -> Users -> New guest user.
- Allow any work or school tenant: set the app registration's supported account type to multi-tenant and set `AZURE_AD_TENANT_ID=organizations`.
- Allow work/school and personal Microsoft accounts: set the supported account type accordingly and set `AZURE_AD_TENANT_ID=common`.

After changing the tenant setting, restart the dev server so the new `.env.local` value is loaded.

## 2. Install and Migrate

Confirm MySQL is running before migration:

```powershell
Get-NetTCPConnection -LocalPort 3306 -ErrorAction SilentlyContinue
```

If that prints nothing, start your MySQL 8 server first or change `DATABASE_URL` to the host and port where MySQL is running. The default `.env.local` value expects MySQL on `127.0.0.1:3306`.

```powershell
npm install
npm run migrate
npm run seed
```

`npm run seed` grants `main_admin` to `INITIAL_ADMIN_EMAIL` if the user already exists. If the user has not signed in yet, it creates a pending invite that links automatically after Microsoft sign-in.

## 3. Import Supabase Data Directly

Create `.env.import.local` with the source Supabase project credentials:

```env
SOURCE_SUPABASE_URL=https://your-project-ref.supabase.co
SOURCE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Then run:

```powershell
npm run import:supabase:replace
```

The replace importer clears the local MySQL app tables first, then reads each matching table from Supabase and upserts it directly into the MySQL database from `DATABASE_URL`. Use this when Supabase is the source of truth and you want the local MySQL database to become the deployable copy.

If you intentionally want to merge into an existing local MySQL dataset instead of replacing it, run `npm run import:supabase`. It skips source tables that do not exist and ignores source columns that are not part of the MySQL schema.

The importer also accepts temporary PowerShell variables with those same names, or the old names `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## 4. Back Up MySQL for Deployment

After the local MySQL database has the imported data, create a SQL backup:

```powershell
npm run backup:mysql
```

The backup is written to `data/mysql-backups`. Import that `.sql` file into the deployment server's MySQL database when you are ready.

## 5. Import Supabase Storage Files

The app now stores uploaded faculty assets under:

```text
public/uploads/faculty-assets
```

After importing the database rows, pull the referenced files from the Supabase `faculty-assets` bucket:

```powershell
npm run import:supabase-files
```

The script reads `photo_path`, `banner_path`, `proof_path`, `certificate_path`, and `paper_path` from MySQL, then downloads those exact objects into `public/uploads/faculty-assets` while keeping the same relative object paths. Use the same `.env.import.local` values from the data import step. To preview what would be fetched without writing files:

```powershell
npm run import:supabase-files:dry-run
```

When deploying to your server, copy `public/uploads/faculty-assets` alongside the MySQL backup import so those stored paths continue to resolve.

## 6. Verify

```powershell
npm run typecheck
npm run lint
npm run build
```

Then test these flows manually:

- Microsoft sign-in and sign-out.
- First admin invite linking.
- Faculty profile edit and image upload.
- Publication, engagement, and research title create/update/delete.
- Admin dashboard, faculty detail, and CSV export.
