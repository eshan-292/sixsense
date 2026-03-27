-- SixSense Database Schema

-- Users profile table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  coins integer not null default 10000,
  total_predictions integer not null default 0,
  total_wins integer not null default 0,
  total_losses integer not null default 0,
  win_streak integer not null default 0,
  best_streak integer not null default 0,
  last_daily_bonus date,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Matches table
create table public.matches (
  id uuid default gen_random_uuid() primary key,
  team_a text not null,
  team_b text not null,
  team_a_short text not null,
  team_b_short text not null,
  match_date timestamptz not null,
  venue text,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  result text check (result in ('team_a_win', 'team_b_win', 'no_result', null)),
  created_at timestamptz not null default now()
);

-- Markets table
create table public.markets (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.matches on delete cascade not null,
  question text not null,
  market_type text not null default 'binary' check (market_type in ('binary', 'multiple_choice')),
  options jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'locked', 'settled')),
  correct_option_id text,
  created_at timestamptz not null default now()
);

-- Predictions table
create table public.predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  market_id uuid references public.markets on delete cascade not null,
  selected_option_id text not null,
  coins_wagered integer not null check (coins_wagered >= 100 and coins_wagered <= 1000),
  coins_won integer,
  created_at timestamptz not null default now(),
  unique (user_id, market_id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.markets enable row level security;
alter table public.predictions enable row level security;

-- Profiles: users can read all, update own
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Matches: everyone can read
create policy "Matches are viewable by everyone" on public.matches
  for select using (true);

create policy "Admins can manage matches" on public.matches
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Markets: everyone can read
create policy "Markets are viewable by everyone" on public.markets
  for select using (true);

create policy "Admins can manage markets" on public.markets
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Predictions: users can read all, insert own
create policy "Predictions are viewable by everyone" on public.predictions
  for select using (true);

create policy "Users can insert own predictions" on public.predictions
  for insert with check (auth.uid() = user_id);

create policy "Service role can update predictions" on public.predictions
  for update using (true);

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Player'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Index for leaderboard queries
create index idx_profiles_coins on public.profiles (coins desc);
create index idx_predictions_user on public.predictions (user_id);
create index idx_predictions_market on public.predictions (market_id);
create index idx_matches_date on public.matches (match_date);
create index idx_markets_match on public.markets (match_id);
