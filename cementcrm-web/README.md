# SPCC CRM -- Web Console

Enterprise-grade desktop web console for the SPCC CRM, built with Next.js (App
Router) and shadcn/ui, sharing the **same Supabase backend** as the mobile
app in `../CementCRM` -- no separate database, no duplicate data entry.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in the same Supabase project
   URL/anon key used by the mobile app:
   ```
   cp .env.example .env.local
   ```
3. Run the dev server:
   ```
   npm run dev
   ```
   Open http://localhost:3000.

Log in with the same credentials you use in the mobile app -- accounts,
leads, and quotations are the same records either way.

## What's here (Phase 1)

- **Dashboard** -- live counts (accounts, open leads, pending quotation
  approvals, orders in flight) and a lead-pipeline-by-stage breakdown.
- **Accounts** -- read-only list of all accounts you have access to (RLS
  applies exactly as it does on mobile: reps see their own, managers see
  everyone).
- **Leads** -- read-only pipeline list with stage and value.
- **Quotations** -- the flagship feature for this console: an approval
  queue showing every quotation pending review across your whole team in
  one sortable table, with inline approve/reject + comment, instead of
  opening leads one at a time on mobile.

Everything else (creating/editing accounts, leads, products, sales orders,
dispatch) still happens in the mobile app for now. This console is additive,
not a replacement.

## Architecture notes

- Auth: Supabase SSR (`@supabase/ssr`), session refreshed on every request
  by `src/proxy.ts` (Next.js 16 renamed Middleware to Proxy).
- Data access: Server Components read directly via the cookie-authenticated
  Supabase server client (`src/lib/supabase/server.ts`); mutations
  (quotation approve/reject) go through a Server Action
  (`src/app/(dashboard)/quotations/actions.ts`).
- `src/types/database.ts` is a copy of the mobile app's schema types (same
  backend, so kept in sync by hand for now -- worth extracting to a shared
  package if this console grows).
- UI components in `src/components/ui/` are hand-written shadcn/ui-style
  components (Radix primitives + Tailwind), not CLI-generated, since the
  `shadcn` CLI's `init`/`add` commands require network access to
  `ui.shadcn.com` which wasn't available when this was built.
