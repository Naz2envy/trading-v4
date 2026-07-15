# TradeSea Phase 2 — Manual Journal

A clean, responsive personal trading journal with Supabase authentication, cloud sync, screenshot uploads, custom dashboard tiles, analytics, date filtering, edit/delete and light/dark modes.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No OpenAI key is required.

## Supabase

Run `supabase-setup.sql` in the Supabase SQL editor. It upgrades an existing TradeSea trades table safely and creates the screenshot storage bucket and security policies.

## Run

```bash
npm install
npm run dev
```
