# TradeSea V4 Foundation

A clean personal trading journal with Supabase authentication, cloud CRUD, realtime sync, date filters, responsive desktop/iPhone UI and light/dark mode.

## Setup
1. Create a Supabase project.
2. Run `supabase-setup.sql` in Supabase SQL Editor.
3. In Supabase Authentication > Providers > Email, enable email/password. Turn Confirm email off for instant signup while testing.
4. Add Vercel environment variables from `.env.example`.
5. Deploy.

## Local development
```bash
npm install
cp .env.example .env.local
npm run dev
```
