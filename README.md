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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
