create extension if not exists pgcrypto;

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument text not null default 'NAS100',
  account text not null default 'Personal',
  direction text not null check (direction in ('long','short')),
  result text not null check (result in ('win','loss','breakeven')),
  pnl numeric not null default 0,
  r_multiple numeric not null default 0,
  risk_amount numeric not null default 0,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  exit_price numeric,
  setup text not null default '',
  session text not null default 'London',
  timeframe text not null default '5m',
  emotion text not null default 'Calm',
  notes text not null default '',
  followed_plan boolean not null default true,
  trade_date date not null default current_date,
  screenshot_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trades add column if not exists account text not null default 'Personal';
alter table public.trades add column if not exists risk_amount numeric not null default 0;
alter table public.trades add column if not exists entry_price numeric;
alter table public.trades add column if not exists stop_loss numeric;
alter table public.trades add column if not exists take_profit numeric;
alter table public.trades add column if not exists exit_price numeric;
alter table public.trades add column if not exists timeframe text not null default '5m';
alter table public.trades add column if not exists screenshot_url text;
alter table public.trades add column if not exists updated_at timestamptz not null default now();

alter table public.trades enable row level security;
drop policy if exists "Users can read their own trades" on public.trades;
drop policy if exists "Users can insert their own trades" on public.trades;
drop policy if exists "Users can update their own trades" on public.trades;
drop policy if exists "Users can delete their own trades" on public.trades;
create policy "Users can read their own trades" on public.trades for select using (auth.uid() = user_id);
create policy "Users can insert their own trades" on public.trades for insert with check (auth.uid() = user_id);
create policy "Users can update their own trades" on public.trades for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own trades" on public.trades for delete using (auth.uid() = user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('trade-screenshots','trade-screenshots',true,8388608,array['image/png','image/jpeg','image/webp','image/heic'])
on conflict (id) do update set public=true,file_size_limit=8388608;

drop policy if exists "Users upload their screenshots" on storage.objects;
drop policy if exists "Users update their screenshots" on storage.objects;
drop policy if exists "Users delete their screenshots" on storage.objects;
create policy "Users upload their screenshots" on storage.objects for insert to authenticated with check (bucket_id='trade-screenshots' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Users update their screenshots" on storage.objects for update to authenticated using (bucket_id='trade-screenshots' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Users delete their screenshots" on storage.objects for delete to authenticated using (bucket_id='trade-screenshots' and (storage.foldername(name))[1]=auth.uid()::text);

do $$ begin
  alter publication supabase_realtime add table public.trades;
exception when duplicate_object then null;
end $$;

-- Accounts and funded-rule tracking
create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  broker text not null default '',
  kind text not null default 'personal' check (kind in ('personal','demo','challenge','funded','archived')),
  currency text not null default 'GBP',
  starting_balance numeric not null default 0,
  profit_target numeric not null default 0,
  daily_loss_limit numeric not null default 0,
  max_drawdown numeric not null default 0,
  drawdown_mode text not null default 'static' check (drawdown_mode in ('static','trailing')),
  drawdown_basis text not null default 'balance' check (drawdown_basis in ('balance','equity')),
  minimum_trading_days integer not null default 0,
  status text not null default 'active' check (status in ('active','passed','failed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trading_accounts enable row level security;
drop policy if exists "Users can read their own accounts" on public.trading_accounts;
drop policy if exists "Users can insert their own accounts" on public.trading_accounts;
drop policy if exists "Users can update their own accounts" on public.trading_accounts;
drop policy if exists "Users can delete their own accounts" on public.trading_accounts;
create policy "Users can read their own accounts" on public.trading_accounts for select using (auth.uid()=user_id);
create policy "Users can insert their own accounts" on public.trading_accounts for insert with check (auth.uid()=user_id);
create policy "Users can update their own accounts" on public.trading_accounts for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "Users can delete their own accounts" on public.trading_accounts for delete using (auth.uid()=user_id);
alter table public.trades add column if not exists account_id uuid references public.trading_accounts(id) on delete set null;
create index if not exists trades_account_id_idx on public.trades(account_id);
do $$ begin
  alter publication supabase_realtime add table public.trading_accounts;
exception when duplicate_object then null;
end $$;

-- Daily session reviews
create table if not exists public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.trading_accounts(id) on delete set null,
  review_date date not null default current_date,
  mood integer not null default 3 check (mood between 1 and 5),
  focus integer not null default 3 check (focus between 1 and 5),
  discipline integer not null default 3 check (discipline between 1 and 5),
  sleep_quality integer not null default 3 check (sleep_quality between 1 and 5),
  what_went_well text not null default '',
  what_to_improve text not null default '',
  next_session_focus text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists daily_reviews_user_date_account_unique
  on public.daily_reviews(user_id, review_date, account_id)
  where account_id is not null;
create unique index if not exists daily_reviews_user_date_general_unique
  on public.daily_reviews(user_id, review_date)
  where account_id is null;
alter table public.daily_reviews enable row level security;
drop policy if exists "Users can read their own daily reviews" on public.daily_reviews;
drop policy if exists "Users can insert their own daily reviews" on public.daily_reviews;
drop policy if exists "Users can update their own daily reviews" on public.daily_reviews;
drop policy if exists "Users can delete their own daily reviews" on public.daily_reviews;
create policy "Users can read their own daily reviews" on public.daily_reviews for select using (auth.uid()=user_id);
create policy "Users can insert their own daily reviews" on public.daily_reviews for insert with check (auth.uid()=user_id);
create policy "Users can update their own daily reviews" on public.daily_reviews for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "Users can delete their own daily reviews" on public.daily_reviews for delete using (auth.uid()=user_id);
do $$ begin
  alter publication supabase_realtime add table public.daily_reviews;
exception when duplicate_object then null;
end $$;
