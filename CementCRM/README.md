# CementCRM

Expo (React Native) CRM app for a cement company's sales team, backed by Supabase.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Supabase project's URL and anon/publishable key (Project Settings -> API in the Supabase dashboard):
   ```
   cp .env.example .env
   ```
3. Apply the database schema: open your Supabase project's **SQL Editor** and run the contents of `supabase/migrations/0001_init.sql`. This creates the `profiles`, `accounts`, and `leads` tables plus the Row Level Security policies that enforce rep/manager visibility.
4. Create user accounts in **Authentication -> Users -> Add user** (email + password, "Auto Confirm User" checked). Every new user automatically gets a `profiles` row with `role = 'rep'` via a database trigger.
5. Promote a user to manager by running this in the SQL Editor (once you have their user id from the Users table):
   ```sql
   update public.profiles set role = 'manager' where id = '<user-uuid>';
   ```
6. Start the app:
   ```
   npm start
   ```
   Scan the QR code with Expo Go, or press `i` / `a` for a simulator.

## How access control works

- Every table has Row Level Security enabled.
- `accounts.assigned_rep` ties an account to one sales rep.
- A user with `role = 'rep'` can only see/edit accounts where `assigned_rep = auth.uid()`, and leads whose linked account is assigned to them.
- A user with `role = 'manager'` can see and edit everything, reassign accounts to any rep, and is the only role that can delete accounts/leads.
- This is enforced in Postgres (via the policies in `supabase/migrations/0001_init.sql`), not just in the app UI — so it holds even if someone calls the API directly.

## Project structure

- `app/` — screens, using Expo Router (file-based navigation)
  - `login.tsx` — email/password sign-in
  - `(tabs)/accounts/` — accounts list, detail/edit, new
  - `(tabs)/leads/` — leads list, detail/edit, new
- `context/AuthContext.tsx` — Supabase session + profile (role) state
- `lib/supabase.ts` — Supabase client
- `components/` — shared form and picker UI
- `types/database.ts` — shared TypeScript types matching the schema
- `supabase/migrations/0001_init.sql` — database schema + RLS policies
