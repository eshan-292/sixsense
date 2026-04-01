# SixSense - IPL 2026 Prediction Market

A free prediction market for IPL 2026. Pick match outcomes, lock in odds, beat your friends, climb the leaderboard. No real money. No fantasy team selection. Just pure cricket IQ.

**Live:** [sixsense-mu.vercel.app](https://sixsense-mu.vercel.app)

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [How Odds Work](#how-odds-work)
4. [Market Types (16 per match)](#market-types-16-per-match)
5. [Game Economy](#game-economy)
6. [Auto-Settlement System](#auto-settlement-system)
7. [Tech Stack](#tech-stack)
8. [Database Schema](#database-schema)
9. [Project Structure](#project-structure)
10. [Setup & Development](#setup--development)
11. [Admin Panel](#admin-panel)
12. [Deployment](#deployment)
13. [Roadmap](#roadmap)

---

## Overview

SixSense is a social prediction game where users predict IPL match outcomes across 16 different markets per match. Sign in with Google, get 10,000 virtual coins, and start predicting. Odds are crowd-driven and shift in real time. Early bets lock better odds. Markets auto-settle by scraping Cricbuzz scorecard data after matches end.

Key differentiators:
- **16 predictions per match** (not just "who will win")
- **Live odds** that move based on what others predict
- **Auto-settlement** from Cricbuzz data (no manual admin needed)
- **Official IPL team logos** from iplt20.com
- **Parlay builder** for combined multi-market bets
- **Points system** (formerly SSR) with streak multipliers

---

## Features

### Prediction Engine
- 16 markets per match covering match winner, top scorer, powerplay stats, sixes, centuries, toss, and more
- Crowd-driven parimutuel odds with weighted seed pools reflecting true probabilities
- Locked odds at prediction time (early bets = better odds)
- Wager range: 10-500 coins per market
- One prediction per market per user

### Parlays
- Combine 2-4 predictions into a single bet with multiplied odds
- Wager up to 1,000 coins on parlays
- All picks must be correct to win
- Auto-resolved when all constituent markets settle

### Live Score Widget
- Scrapes Cricbuzz match pages for live scores during matches
- Shows team scores, overs, and match status
- 30-second auto-refresh with manual refresh button
- Collapsible UI, defaults to collapsed

### Auto-Settlement
- Scrapes Cricbuzz match page + scorecard page after match ends
- Resolves all 16 market types automatically
- Settles predictions, pays out coins, updates points and streaks
- Triggered on page loads (debounced to 5-min intervals) + daily Vercel cron

### Leaderboard
- Two tabs: Points leaders, Coin leaders
- Displays wins/losses, streak info
- Personal rank card for logged-in users

### User Profile
- Google OAuth via Supabase
- Coin balance, win rate, prediction history
- Achievement badges (19 achievements across 5 categories)
- Daily bonus: 500 coins on first prediction each day

### Admin Panel
- Match management (add, edit status, reset)
- Market creation with 16 auto-generated templates
- Manual settlement with auto-fetch from Cricbuzz
- User management with Gmail display, coin grants, admin toggle, user deletion
- Clear bets and reset match functionality

---

## How Odds Work

SixSense uses a **weighted parimutuel odds system**. Each option is seeded with virtual liquidity proportional to its implied probability from initial odds.

### Formula

```
seed(option) = (1/option.odds) / sum(1/all_options.odds) * TOTAL_SEED

odds(option) = total_pool / option_pool
where option_pool = actual_wagers + seed(option)
```

### Example: "Will there be a Super Over?"

Initial odds: Yes = 15x, No = 1.05x

- Implied probability: Yes = 1/15 = 6.7%, No = 1/1.05 = 95.2%
- Seed distribution (TOTAL_SEED = 1000): Yes gets ~65 coins seed, No gets ~935
- Starting displayed odds: **Yes 15.38x**, **No 1.07x** (close to initial odds)

As users bet, odds shift from these starting points naturally. Popular picks get lower odds, contrarian picks get higher odds.

### Locked Odds

When you predict, your odds are **locked**. If you bet on "Yes, Super Over!" at 15x and later the odds drop to 10x, you still get paid at 15x if correct.

---

## Market Types (16 per match)

Every match auto-generates these 16 prediction markets:

| # | Market | Tier | Options | Initial Odds |
|---|--------|------|---------|-------------|
| 1 | Match Winner | Easy | Team A / Team B | 2x / 2x |
| 2 | Total Runs O/U 340 | Easy | Over / Under | 1.9x / 1.9x |
| 3 | First Innings Score | Medium | <150 / 150-179 / 180-199 / 200+ | 3x / 2.5x / 2.5x / 3x |
| 4 | Player of the Match (team) | Easy | Team A player / Team B player | 2x / 2x |
| 5 | First Ball Six | Hard | Yes / No | 8x / 1.1x |
| 6 | Century Scored | Hard | Yes / No | 5x / 1.15x |
| 7 | Fifty in Powerplay | Hard | Yes / No | 4x / 1.2x |
| 8 | Powerplay Score | Medium | <40 / 40-55 / 56-70 / 71+ | 3.5x / 2.2x / 2.5x / 3x |
| 9 | Most Sixes (team) | Medium | Team A / Team B / Equal | 2x / 2x / 6x |
| 10 | Wicket in First Over | Hard | Yes / No | 4x / 1.2x |
| 11 | Highest Individual Score | Medium | <50 / 50-74 / 75-99 / 100+ | 2.5x / 2.2x / 3x / 5x |
| 12 | Total Sixes | Medium | <10 / 10-15 / 16-20 / 21+ | 2.5x / 2x / 2.5x / 3.5x |
| 13 | Super Over | Hard | Yes / No | 15x / 1.05x |
| 14 | Win Margin | Medium | 1-20 runs / 21-40 / 40+ / By wickets | 3x / 2.5x / 4x / 2x |
| 15 | Toss Winner | Easy | Team A / Team B | 2x / 2x |
| 16 | Top Scorer | Hard | 4 batsmen per team + "Someone else" | 8x each / 3x |

Top scorer uses real 2026 squad data (verified post-auction: Kohli, Rohit, Gill, Pant, Jaiswal, etc.)

---

## Game Economy

| Mechanic | Details |
|----------|---------|
| Starting balance | 10,000 coins |
| Wager range | 10-500 per market, 10-1,000 per parlay |
| Payout | `wager * locked_odds` for correct predictions |
| Daily bonus | +500 coins on first prediction of each day |
| Safety net | Auto-refill to 2,000 if balance drops below 1,000 |
| Markets lock | When match status transitions to "live" |

### Points (Prediction Rating)

Points measure prediction skill, separate from coins.

| Event | Points Change |
|-------|--------------|
| Correct Easy market | +10 |
| Correct Medium market | +25 |
| Correct Hard market | +50 |
| 3+ win streak | 1.5x multiplier |
| 5+ win streak | 2x multiplier |
| Incorrect prediction | -3 (floor at 0) |
| Winning parlay | +25 per leg |

---

## Auto-Settlement System

Matches settle automatically without admin intervention.

### Flow
```
Match created (admin) -> upcoming -> [auto] live -> [auto] completed + settled
```

1. **Upcoming -> Live**: `autoUpdateMatchStatuses()` runs on every page load. When `match_date` passes, it sets status to "live" and locks all markets.

2. **Live -> Completed**: `autoSettleCompletedMatches()` checks for matches that have been live 3.5+ hours. Scrapes Cricbuzz for results.

3. **Settlement**: When Cricbuzz shows "won by X", it:
   - Fetches the match page (result, scores, toss, highest scorer)
   - Fetches the scorecard page (sixes per batter, powerplay scores, fall of wickets)
   - Maps results to all 16 market types
   - Settles each market, pays out coins, updates points and streaks
   - Resolves parlays
   - Sets match to "completed" with result

### Data Sources

| Market | Data Source | Extraction Method |
|--------|-----------|------------------|
| Match Winner | Match page | "won by" text |
| Toss Winner | Match page | "opted to bat/bowl" |
| Total Runs | Match page | Sum scores from og:title |
| First Innings Score | Match page | First score in og:title |
| Player of the Match | Match page | Winning team (heuristic) |
| Century / Highest Score | Scorecard | Batting table rows (runs/balls/4s/6s) |
| Super Over | Match page | "won by" implies no super over |
| Win Margin | Match page | Parse "won by X runs/wkts" |
| Total Sixes / Most Sixes | Scorecard | Sum 6s column per innings |
| Powerplay Score | Scorecard | "Mandatory / 0.1-6 / SCORE" pattern |
| Wicket in First Over | Scorecard | First FOW over number <= 1.0 |
| 50+ in Powerplay | Scorecard | PP score >= 65 -> likely yes |
| First Ball Six | Default "No" | ~3-5% occurrence rate |
| Top Scorer | Scorecard | Highest runs in batting table |

### Debouncing
- Auto-settle runs at most once per 5 minutes (in-memory timestamp guard)
- Concurrent runs prevented by `settleRunning` flag
- Vercel cron as daily backup safety net

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Database | Supabase (PostgreSQL with Row Level Security) |
| Auth | Supabase Auth (Google OAuth) |
| Styling | Tailwind CSS 4 |
| Language | TypeScript 5 |
| Hosting | Vercel |
| Live Scores | Cricbuzz HTML scraping |
| Team Logos | IPL official CDN (scores.iplt20.com) |

All infrastructure runs on free tiers.

---

## Database Schema

### `profiles`
Auto-created on signup via database trigger.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK, FK auth.users) | User ID |
| display_name | text | From Google profile |
| avatar_url | text | From Google profile |
| coins | integer (default 10,000) | Virtual coin balance |
| total_predictions | integer | Lifetime prediction count |
| total_wins / total_losses | integer | Win/loss counts |
| win_streak / best_streak / current_streak | integer | Streak tracking |
| ssr | integer (default 0) | Points rating |
| ssr_today | integer (default 0) | Points earned today |
| last_daily_bonus | date | Last daily bonus claim |
| is_admin | boolean | Admin access |

### `matches`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Match ID |
| team_a / team_b | text | Full team names |
| team_a_short / team_b_short | text | Short codes (CSK, MI, etc.) |
| match_date | timestamptz | Match date/time (IST) |
| venue | text | Stadium name |
| status | text | `upcoming` / `live` / `completed` |
| result | text | `team_a_win` / `team_b_win` / `no_result` |

### `markets`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Market ID |
| match_id | uuid (FK) | Parent match |
| question | text | Market question |
| market_type | text | `binary` / `multiple_choice` |
| options | jsonb | `[{id, label, odds}]` |
| status | text | `open` / `locked` / `settled` |
| correct_option_id | text | Set on settlement |
| tier | text | `easy` / `medium` / `hard` |

### `predictions`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Prediction ID |
| user_id | uuid (FK) | User |
| market_id | uuid (FK) | Market |
| selected_option_id | text | Chosen option |
| coins_wagered | integer (10-1,000) | Wager amount |
| coins_won | integer (nullable) | Payout (null = pending) |
| locked_odds | numeric(6,2) | Odds locked at prediction time |
| ssr_earned | integer | Points earned/lost |

### `parlays`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Parlay ID |
| user_id / match_id | uuid (FK) | User and match |
| predictions | jsonb | `[{market_id, selected_option_id}]` |
| coins_wagered | integer | Parlay wager |
| combined_odds | numeric(6,2) | Multiplied odds |
| status | text | `active` / `won` / `lost` |
| coins_won | integer | Payout if won |

RLS enabled on all tables. Users can read all data but only write their own.

---

## Project Structure

```
sixsense/
├── app/
│   ├── layout.tsx                    # Root layout (Navbar + BottomNav)
│   ├── page.tsx                      # Home: countdown, today, upcoming, recent, how-to-play
│   ├── globals.css                   # Design system (CSS vars, card, btn, animations)
│   ├── schedule/                     # Full 70-match schedule with team filter
│   ├── match/[id]/
│   │   ├── page.tsx                  # Server: fetch match, markets, betting status
│   │   └── MatchDetailClient.tsx     # Client: markets, parlay bar, live score, win celebration
│   ├── leaderboard/                  # Points + Coins leaderboards
│   ├── profile/                      # User stats, achievements, daily bonus
│   ├── my-bets/                      # Prediction history (active/settled/parlays)
│   ├── how-to-play/                  # Rules and strategy guide
│   ├── admin/
│   │   ├── matches/                  # Add matches, create markets (16 templates)
│   │   ├── settle/                   # Manual settlement with auto-fetch
│   │   └── users/                    # User management (emails, coins, admin toggle)
│   └── api/
│       ├── predict/route.ts          # Place prediction (odds lock, daily bonus, safety net)
│       ├── settle/route.ts           # Settle market (coins, points, streaks, parlays)
│       ├── parlay/route.ts           # Place parlay
│       ├── auto-settle/route.ts      # Cron endpoint for auto-settlement
│       ├── live-score/route.ts       # Cricbuzz scraper for live scores
│       └── admin/                    # Admin APIs (users, clear-bets, reset, fetch-results)
├── components/
│   ├── Navbar.tsx                    # Logo + coins + avatar (links to /profile)
│   ├── BottomNav.tsx                 # 4 tabs: Home, My Bets, Ranks, Profile (SVG icons)
│   ├── MatchCard.tsx                 # Match card with team logos, date, status
│   ├── MarketCard.tsx                # Betting card: options, odds, preset wagers + slider
│   ├── TeamBadge.tsx                 # IPL team logo (falls back to colored circle)
│   ├── LiveScoreWidget.tsx           # Collapsible live score from Cricbuzz
│   ├── NextMatchCountdown.tsx        # Compact countdown banner
│   ├── WinCelebration.tsx            # Confetti + win modal
│   ├── ActivityFeed.tsx              # Real-time prediction feed (Supabase subscriptions)
│   ├── AchievementBadge.tsx          # Achievement display
│   └── Toast.tsx                     # Toast notification system
├── lib/
│   ├── auto-settle.ts               # Cricbuzz scraping + market resolution + settlement
│   ├── auto-status.ts               # Match status transitions (upcoming->live->settled)
│   ├── cricket-api.ts               # CricketData.org integration (backup)
│   ├── achievements.ts              # 19 achievements across 5 categories
│   ├── types.ts                      # TypeScript interfaces
│   ├── utils.ts                      # Helpers (formatCoins, timeUntil, getTeamColor, getTeamLogo)
│   └── supabase/                     # Client, server, and admin Supabase clients
├── supabase/migrations/              # 5 SQL migration files
├── vercel.json                       # Cron config (daily auto-settle)
├── TODO.md                           # Feature roadmap
└── package.json
```

---

## Setup & Development

### Prerequisites
- Node.js 18+
- Supabase project (free tier)
- Google OAuth app (configured in Supabase Auth)

### 1. Clone and install

```bash
git clone https://github.com/eshan-292/sixsense.git
cd sixsense
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Database setup

Run migrations in order in Supabase SQL editor:
1. `001_initial.sql` - profiles, matches, markets, predictions, RLS, triggers
2. `004_ssr_and_parlays.sql` - points fields, tiers, parlays table
3. `005_locked_odds.sql` - dynamic locked odds
4. `006_cric_match_id.sql` - Cricbuzz match ID column
5. `007_update_wager_range.sql` - updated wager constraints (10-1000)

Enable Google OAuth in Supabase Auth > Providers. Add callback URLs:
- `http://localhost:3000/auth/callback` (dev)
- `https://your-domain.vercel.app/auth/callback` (prod)

### 4. Run locally

```bash
npm run dev
```

### 5. Make yourself admin

```sql
UPDATE profiles SET is_admin = true WHERE display_name = 'Your Name';
```

---

## Admin Panel

Access at `/admin` (visible only to admins in navbar).

### Match Management (`/admin/matches`)
- Add matches by selecting from 10 IPL teams with date/time/venue
- **16 markets auto-created** for every new match (all templates)
- Change status: upcoming -> live -> completed
- Reset match (reopens markets, clears settlement)
- Clear all bets on a match

### Market Settlement (`/admin/settle`)
- Auto-fetch results from Cricbuzz (one-click per match)
- Shows suggested answers with auto-resolve indicators
- Manual override for markets that can't be auto-resolved
- "Auto-Settle All" for bulk settlement

### User Management (`/admin/users`)
- All signed-in users with Gmail addresses and join dates
- Grant coins, reset coins, toggle admin status
- Delete users (removes predictions, parlays, profile, and auth)

---

## Deployment

Hosted on **Vercel**. Deploy manually:

```bash
vercel --prod
```

Ensure environment variables are set in Vercel project settings.

Note: GitHub webhook for auto-deploy may need reconnection. Use `vercel --prod` to deploy directly.

---

## Roadmap

See [TODO.md](./TODO.md) for the full feature roadmap:
- Referral system (invite friends, both get coins)
- Daily challenges (predict X markets for bonus)
- Head-to-head challenges
- Private leagues
- Live match chat
- In-play micro predictions
- Streak rewards UI

---

## License

MIT
