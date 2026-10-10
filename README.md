This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Employee master setup

Upload processing reads employee lookups from Supabase; it no longer reads `EXPORT3.xlsx` or `17092026B.XLSX` from the application filesystem.

1. Apply the SQL migrations in `supabase/migrations/` to the Supabase project, in filename order.
2. Import the employee master data into `public.employee_master` using the Supabase Table Editor CSV import. Use these column names: `personnel_number`, `full_name`, `mandor_code`, `mandor_name`, `kasie`, `choice`, and `subdep`. The personnel number is the primary key.
3. Merge the latest Kasie values from the secondary workbook into the `kasie` column by `personnel_number` before importing.
4. Set `SUPABASE_SERVICE_ROLE_KEY` as a server-only environment variable in local `.env.local` and the deployment environment. Never expose it with a `NEXT_PUBLIC_` prefix.

Row-level security is enabled on `employee_master` without public policies. The upload route reads it with the server-only service-role client. Keep employee master exports out of Git.

The migrations also revoke direct client write privileges on upload and mandor tables and deny client access to the `excel-backups` storage bucket. Upload, mandor import, and rollback routes use the server-only service-role client; upload replacement runs in a single PostgreSQL transaction through `replace_monthly_upload`. Browser reads continue using the anon key.

## Downloading saved upload data with its summary

The dashboard's **Data Lengkap** action builds a workbook from the saved `employee_domisili` records for the selected upload. It includes a `Data Karyawan` sheet with every employee field retained in the database and a `Ringkasan` sheet with village/district totals and the Top 10 village chart. It uses the signed-in user's Supabase session to read the data and does not require the service-role key for downloading. Source columns that are not stored in `employee_domisili` cannot be reconstructed in this export.

## Authentication setup

The application uses Supabase Auth with cookie-based sessions. The existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` variables are sufficient; `AUTH_SESSION_SECRET` and `HR_USERS_JSON` are not used.

To create the first account:

1. In the Supabase project, open **Authentication → Users** and add a user with the email and password that will be used to sign in. Disable email confirmation for this account if the project does not have email delivery configured.
2. In the Supabase SQL Editor, assign its trusted application role by replacing the email below:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"HR Manager"}'::jsonb
   where email = 'admin@example.com';
   ```

   Supported roles are `People Partner`, `HR Manager`, and `Staff`. Only `People Partner` and `HR Manager` may upload data, import mandor mappings, or roll back uploads. Accounts without an assigned role have `Staff` access. Roles are read from Supabase `app_metadata`, not user-editable metadata.

Sign in using the email and password created in Supabase. The login is verified against Supabase Auth, while the proxy refreshes the session cookies. Do not put passwords in source code or expose service-role keys in the browser.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
