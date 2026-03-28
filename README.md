# SixSense - IPL 2026 Prediction Market

A play-money prediction market for IPL 2026. Predict match outcomes, earn virtual coins, build parlays, climb the leaderboard, and prove your cricket IQ. No real money involved.

**Live:** [sixsense-mu.vercel.app](https://sixsense-mu.vercel.app)

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [How Dynamic Odds Work](#how-dynamic-odds-work)
5. [Game Mechanics](#game-mechanics)
6. [Database Schema](#database-schema)
7. [Project Structure](#project-structure)
8. [Setup & Development](#setup--development)
9. [Deployment](#deployment)
10. [Admin Usage](#admin-usage)
11. [License](#license)

---

## Overview

SixSense is a social prediction market built around the IPL 2026 season. Users sign in with Google, receive 10,000 virtual coins, and place predictions on match outcomes across tiered markets. Odds shift dynamically based on the crowd's predictions, rewarding early and contrarian bets. A dual-track scoring system tracks both coin balance (from wagering) and SSR (SixSense Rating) for prestige. Parlays let users combine multiple predictions for amplified payouts. A global leaderboard ranks players by SSR, coins, streaks, and daily performance.

---

## Features

### Core Prediction Engine
- **Dynamic odds** that shift in real time based on the prediction pool (crowd-driven parimutuel model with virtual base liquidity)
- **Locked odds for early bettors** -- the odds at the time you place your prediction are the odds you keep, regardless of how the pool shifts afterward
- **Tiered markets** with increasing risk and reward:
  - **Safe Picks** (easy) -- +10 SSR per correct prediction
  - **Smart Calls** (medium) -- +25 SSR per correct prediction
  - **Bold Predictions** (hard) -- +50 SSR per correct prediction
- **Parlay builder** -- combine 2 to 4 predictions from the same match into a single high-risk, high-reward bet with combined multiplied odds
- **One prediction per market per user** -- no double-dipping

### Scoring & Economy
- **Dual-track scoring:** Coins (virtual currency for wagering) + SSR (SixSense Rating for prestige and leaderboard rank)
- **10,000 starting coins** for every new user
- **Wager range:** 100 to 1,000 coins per individual market prediction
- **Daily bonus:** 500 coins automatically granted on your first prediction of each day
- **Safety net:** If your balance drops below 1,000 coins after a wager, it auto-refills to 2,000 so you can keep playing
- **Streak multipliers for SSR:**
  - 3+ consecutive wins: 1.5x SSR reward
  - 5+ consecutive wins: 2x SSR reward
- **SSR penalty:** -3 SSR for incorrect predictions (minimum 0)
- **Parlay SSR bonus:** 25 SSR per leg on a winning parlay

### Leaderboard
- **Four leaderboard tabs:** SSR (overall rating), Coins (total balance), Streaks (current win streak), Today (daily SSR earned)
- **Top 50 displayed** per category with personal rank card
- **Mini leaderboard** on the home page showing the top 3 players by coins

### User Experience
- **Google OAuth** sign-in via Supabase
- **70 real IPL 2026 matches** with correct dates, times (IST), and venues
- **Live match countdown** timer on the home page (days, hours, minutes, seconds)
- **Sequential betting** -- only the next upcoming match has open markets; all others are locked until the current match concludes
- **Share predictions** to WhatsApp, X (Twitter), or clipboard -- both before and after settlement
- **Mobile-first PWA design** with bottom tab navigation, frosted glass UI, and loading skeletons on every page
- **Custom 404 page**

### Admin Panel
- **Match management** -- add matches by selecting from all 10 IPL teams, set date/time/venue, change status (upcoming, live, completed)
- **Market creation** -- create custom markets or use quick templates (Match Winner, Total Runs O/U, First Innings Score, Player of the Match)
- **Bulk template creation** -- one-click to generate all 4 standard markets for a match
- **Market settlement** -- select the correct outcome; coins and SSR are automatically distributed to all players
- **Parlay auto-resolution** -- when all markets in a parlay are settled, the parlay is automatically resolved and credited

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Database | Supabase (PostgreSQL with Row Level Security) |
| Auth | Supabase Auth (Google OAuth) |
| Styling | Tailwind CSS 4 |
| Language | TypeScript 5 |
| Hosting | Vercel (auto-deploy on push to main) |

All infrastructure runs on free tiers.

---

## How Dynamic Odds Work

SixSense uses a **pool-based parimutuel odds system** with virtual base liquidity to ensure stable, fair odds even with small prediction pools.

### The Mechanism

1. **Base liquidity:** Each option in a market starts with a virtual base pool of 500 coins. This prevents extreme odds when only a few users have predicted.

2. **Odds calculation:**
   ```
   odds(option) = total_effective_pool / option_effective_pool
   ```
   Where `effective_pool = actual_wagers + 500 (base liquidity)` for each option.

3. **Example:** A binary market ("Who will win -- CSK or MI?") with 2,000 coins wagered on CSK and 800 coins on MI:
   - CSK effective pool: 2,000 + 500 = 2,500
   - MI effective pool: 800 + 500 = 1,300
   - Total: 3,800
   - CSK odds: 3,800 / 2,500 = **1.52x**
   - MI odds: 3,800 / 1,300 = **2.92x**

4. **Locked odds:** When you place a prediction, the current odds are **locked** for you. Even if thousands of coins pour into your option afterward (driving the odds down), you keep the odds you saw when you clicked "Predict." This rewards early and contrarian bets.

5. **Settlement payout:** `coins_won = coins_wagered * locked_odds` for correct predictions. Incorrect predictions receive 0 coins.

---

## Game Mechanics

### Coins Economy

| Mechanic | Details |
|----------|---------|
| Starting balance | 10,000 coins |
| Wager range | 100 -- 1,000 per market (individual), 100 -- 2,000 per parlay |
| Payout | `wager * locked_odds` (dynamic, crowd-driven) |
| Daily bonus | 500 coins on first prediction of the day |
| Safety net | Auto-refill to 2,000 if balance drops below 1,000 |
| Market lock | Markets lock when match status changes to "live" |

### SSR (SixSense Rating) System

SSR is a prestige score separate from coins. It measures prediction skill and consistency.

| Event | SSR Change |
|-------|-----------|
| Correct Safe Pick (easy) | +10 SSR |
| Correct Smart Call (medium) | +25 SSR |
| Correct Bold Prediction (hard) | +50 SSR |
| 3+ win streak multiplier | 1.5x the base SSR reward |
| 5+ win streak multiplier | 2x the base SSR reward |
| Incorrect prediction | -3 SSR (floor at 0) |
| Winning parlay bonus | +25 SSR per leg |

### Market Tiers

| Tier | Label | SSR Reward | Risk Level |
|------|-------|-----------|------------|
| Easy | Safe Pick | +10 SSR | Low risk, common outcomes (e.g., match winner) |
| Medium | Smart Call | +25 SSR | Medium risk, requires insight (e.g., first innings score range) |
| Hard | Bold Prediction | +50 SSR | High risk, unlikely outcomes (e.g., exact score bracket) |

### Parlays

- Combine 2 to 4 predictions from the same match into a single parlay
- Combined odds = product of individual option odds
- Wager range: 100 to 2,000 coins (capped at your balance)
- **All predictions must be correct** to win; partial wins are not awarded
- Automatically resolved when all constituent markets are settled
- Winning parlays grant bonus SSR (25 per leg)

---

## Database Schema

### `profiles`
Extends Supabase `auth.users`. Auto-created on signup via database trigger.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK, FK to auth.users) | User ID |
| display_name | text | From Google profile |
| avatar_url | text | From Google profile |
| coins | integer (default 10,000) | Virtual coin balance |
| total_predictions | integer | Lifetime prediction count |
| total_wins | integer | Lifetime correct predictions |
| total_losses | integer | Lifetime incorrect predictions |
| win_streak | integer | Current consecutive wins |
| best_streak | integer | All-time best consecutive wins |
| current_streak | integer | Active streak (for SSR multiplier) |
| ssr | integer (default 0) | SixSense Rating (prestige score) |
| ssr_today | integer (default 0) | SSR earned today |
| last_daily_bonus | date | Last date daily bonus was granted |
| is_admin | boolean (default false) | Admin access flag |

### `matches`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Match ID |
| team_a / team_b | text | Full team names |
| team_a_short / team_b_short | text | Short codes (e.g., CSK, MI) |
| match_date | timestamptz | Match date and time (IST) |
| venue | text | Stadium name |
| status | text | `upcoming`, `live`, or `completed` |
| result | text | `team_a_win`, `team_b_win`, `no_result`, or null |

### `markets`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Market ID |
| match_id | uuid (FK to matches) | Parent match |
| question | text | e.g., "Who will win CSK vs MI?" |
| market_type | text | `binary` or `multiple_choice` |
| options | jsonb | Array of `{id, label, odds}` objects |
| status | text | `open`, `locked`, or `settled` |
| correct_option_id | text | Set on settlement |
| tier | text | `easy`, `medium`, or `hard` |

### `predictions`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Prediction ID |
| user_id | uuid (FK to profiles) | User who predicted |
| market_id | uuid (FK to markets) | Market predicted on |
| selected_option_id | text | Chosen option ID |
| coins_wagered | integer (100-1,000) | Amount wagered |
| coins_won | integer (nullable) | Payout after settlement |
| locked_odds | numeric(6,2) | Dynamic odds locked at prediction time |
| ssr_earned | integer (default 0) | SSR gained or lost on settlement |

Unique constraint: one prediction per user per market.

### `parlays`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Parlay ID |
| user_id | uuid (FK to profiles) | User who placed it |
| match_id | uuid (FK to matches) | Match the parlay covers |
| predictions | jsonb | Array of `{market_id, selected_option_id}` |
| coins_wagered | integer | Amount wagered on the parlay |
| combined_odds | numeric(6,2) | Product of all individual odds |
| status | text | `active`, `won`, `lost`, or `partial` |
| coins_won | integer (nullable) | Payout if won |
| ssr_earned | integer (default 0) | SSR bonus if won |

Row Level Security is enabled on all tables. Users can read all data but only write their own. Admins have full access to matches and markets.

---

## Project Structure

```
sixsense/
├── app/
│   ├── layout.tsx                    # Root layout, navbar, footer, bottom nav
│   ├── page.tsx                      # Home -- today's matches, countdown, mini leaderboard, stats
│   ├── globals.css                   # Global styles (glass effects, gradients)
│   ├── not-found.tsx                 # Custom 404 page
│   ├── loading.tsx                   # Home loading skeleton
│   ├── schedule/
│   │   └── page.tsx                  # Full 70-match schedule with team filter
│   ├── match/[id]/
│   │   ├── page.tsx                  # Match detail (server -- fetches match, markets, betting status)
│   │   ├── MatchDetailClient.tsx     # Match UI, tiered markets, parlay builder (client)
│   │   └── loading.tsx               # Match loading skeleton
│   ├── leaderboard/
│   │   ├── page.tsx                  # Leaderboard with 4 tabs (SSR, Coins, Streaks, Today)
│   │   └── LeaderboardTabs.tsx       # Tab switching component (client)
│   ├── profile/
│   │   └── page.tsx                  # User profile, stats, prediction history
│   ├── how-to-play/
│   │   └── page.tsx                  # Rules and gameplay guide
│   ├── admin/
│   │   ├── page.tsx                  # Admin dashboard
│   │   ├── matches/page.tsx          # Add matches, create markets (templates + custom)
│   │   └── settle/page.tsx           # Settle markets with correct outcomes
│   ├── api/
│   │   ├── predict/route.ts          # POST -- place prediction, deduct coins, daily bonus, safety net
│   │   ├── settle/route.ts           # POST -- settle market, distribute coins + SSR, resolve parlays
│   │   ├── parlay/route.ts           # POST -- place parlay bet
│   │   └── admin/route.ts            # Admin API endpoints
│   ├── auth/
│   │   └── callback/route.ts         # Google OAuth callback handler
│   └── user/                         # User-related pages
├── components/
│   ├── Navbar.tsx                    # Sticky frosted glass top navbar
│   ├── BottomNav.tsx                 # Mobile bottom tab bar (Home, Schedule, Leaderboard, Profile)
│   ├── Footer.tsx                    # Footer with links and disclaimer
│   ├── MatchCard.tsx                 # Match card with team badges, countdown, market/prediction counts
│   ├── MarketCard.tsx                # Prediction market -- dynamic odds, wager slider, tier badges, SSR display
│   ├── NextMatchCountdown.tsx        # Live countdown timer (days:hrs:min:sec)
│   ├── ShareButton.tsx               # Share to WhatsApp / X / clipboard
│   ├── Toast.tsx                     # Toast notification system
│   └── Providers.tsx                 # Client providers wrapper
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server-side Supabase client
│   │   └── admin.ts                  # Service role client (for settlement operations)
│   ├── types.ts                      # TypeScript interfaces (Profile, Match, Market, Prediction, Parlay, etc.)
│   └── utils.ts                      # Helpers: formatCoins, timeUntil, getTeamColor
├── supabase/
│   └── migrations/
│       ├── 001_initial.sql           # Base schema: profiles, matches, markets, predictions, RLS, triggers
│       ├── 004_ssr_and_parlays.sql   # SSR fields, market tiers, parlays table
│       └── 005_locked_odds.sql       # Dynamic locked odds column on predictions
├── public/
│   └── manifest.json                 # PWA manifest
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## Setup & Development

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- A Google OAuth app (configured in Supabase Auth > Providers)

### 1. Clone and install

```bash
git clone https://github.com/eshan-292/sixsense.git
cd sixsense
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key for client-side access (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for admin operations like settlement (server-side only, never exposed to client) |

### 3. Supabase setup

1. Run the migration files in order from `supabase/migrations/` in your Supabase SQL editor:
   - `001_initial.sql` -- creates profiles, matches, markets, predictions tables with RLS and triggers
   - `004_ssr_and_parlays.sql` -- adds SSR fields, market tiers, and parlays table
   - `005_locked_odds.sql` -- adds locked_odds column for dynamic odds
2. Enable **Google OAuth** in Authentication > Providers
3. Add redirect URLs in Supabase Auth settings:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.vercel.app/auth/callback` (production)
4. The `handle_new_user()` trigger automatically creates a profile row when a user signs up

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Make yourself admin

In the Supabase table editor or SQL editor, set `is_admin = true` on your profile row:

```sql
UPDATE profiles SET is_admin = true WHERE display_name = 'Your Name';
```

---

## Deployment

SixSense is deployed on **Vercel** with auto-deploy from the `main` branch.

1. Push to `main` -- Vercel builds and deploys automatically
2. Ensure all three environment variables are set in Vercel project settings (Settings > Environment Variables)
3. Add the production callback URL (`https://your-domain.vercel.app/auth/callback`) to Supabase Auth redirect URLs

---

## Admin Usage

1. Set `is_admin = true` on your profile in Supabase
2. Access `/admin` from the navbar (visible only to admins)
3. **Manage Matches** (`/admin/matches`):
   - Add new matches by selecting from all 10 IPL teams
   - Set date, time (IST), and venue
   - Change match status: upcoming -> live (locks all markets) -> completed
4. **Create Markets**:
   - Use quick templates: Match Winner, Total Runs O/U, First Innings Score, Player of the Match
   - Or create custom markets with custom options, odds, and tier
   - "Create All 4 Templates at Once" for one-click market setup
5. **Settle Markets** (`/admin/settle`):
   - Select the correct outcome for each market
   - Settlement automatically distributes coin payouts, updates SSR, resolves streaks, and settles any dependent parlays

---

## License

MIT
