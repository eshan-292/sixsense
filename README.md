# SixSense - IPL Prediction Market

A play-money prediction market for IPL 2026. Users predict match outcomes, wager virtual coins, and compete on a global leaderboard. No real money involved.

**Live:** [sixsense-mu.vercel.app](https://sixsense-mu.vercel.app)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Database + Auth | Supabase (PostgreSQL + Google OAuth) |
| Styling | Tailwind CSS 4 |
| Hosting | Vercel (auto-deploy on push) |
| Language | TypeScript |

All infrastructure runs on free tiers.

## Features

- **Google OAuth** sign-in via Supabase
- **70 real IPL 2026 matches** with correct dates, times, and venues
- **Prediction markets** per match (who wins, total runs, first innings score, POTM)
- **Virtual coin system** — 10,000 starting coins, 100-1,000 wager per market
- **Fixed odds payouts** — automatic settlement distributes winnings
- **Global leaderboard** ranked by total coins
- **Daily bonus** — 500 coins/day for active users
- **Live countdown timer** to next match on home page
- **Team filter** on schedule page (filter by any of 10 IPL teams)
- **Share predictions** to WhatsApp/X/clipboard
- **Admin panel** — manage matches, create markets (with templates), settle outcomes
- **Mobile-first** with bottom tab navigation
- **Loading skeletons** on all pages
- **Custom 404** page

## Project Structure

```
sixsense/
├── app/
│   ├── layout.tsx              # Root layout, navbar, footer, bottom nav
│   ├── page.tsx                # Home — today's matches, countdown, stats
│   ├── not-found.tsx           # Custom 404 page
│   ├── loading.tsx             # Home loading skeleton
│   ├── schedule/
│   │   ├── page.tsx            # Full 70-match schedule (server component)
│   │   ├── ScheduleClient.tsx  # Team filter + match list (client component)
│   │   └── loading.tsx         # Schedule loading skeleton
│   ├── match/[id]/
│   │   ├── page.tsx            # Match detail (server, fetches match + markets)
│   │   ├── MatchDetailClient.tsx # Match UI + prediction cards (client)
│   │   └── loading.tsx         # Match loading skeleton
│   ├── leaderboard/
│   │   ├── page.tsx            # Global leaderboard with podium
│   │   └── loading.tsx         # Leaderboard loading skeleton
│   ├── profile/
│   │   ├── page.tsx            # User profile, stats, daily bonus, history
│   │   └── loading.tsx         # Profile loading skeleton
│   ├── how-to-play/
│   │   └── page.tsx            # Rules and tips
│   ├── admin/
│   │   ├── page.tsx            # Admin dashboard with stats
│   │   ├── matches/page.tsx    # Add matches, create markets (with templates)
│   │   └── settle/page.tsx     # Settle markets with confirmation modal
│   ├── api/
│   │   ├── predict/route.ts    # POST — place prediction, deduct coins
│   │   └── settle/route.ts     # POST — settle market, distribute winnings
│   └── auth/
│       └── callback/route.ts   # Google OAuth callback handler
├── components/
│   ├── Navbar.tsx              # Sticky frosted glass navbar
│   ├── BottomNav.tsx           # Mobile bottom tab bar
│   ├── Footer.tsx              # Footer with links + disclaimer
│   ├── MatchCard.tsx           # Match card with countdown, team badges
│   ├── MarketCard.tsx          # Prediction market with wager slider
│   ├── NextMatchCountdown.tsx  # Live countdown timer (days:hrs:min:sec)
│   └── ShareButton.tsx         # Share to WhatsApp/X/clipboard
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server-side Supabase client
│   │   └── admin.ts            # Service role client (for settlement)
│   ├── types.ts                # TypeScript interfaces
│   └── utils.ts                # formatCoins, timeUntil, getTeamColor
└── public/
    └── manifest.json           # PWA manifest
```

## Database Schema

### profiles
Extends Supabase `auth.users`. Stores coins balance, prediction stats, streaks, and admin flag.

### matches
IPL match data: teams (full name + short code), date/time, venue, status (`upcoming` | `live` | `completed`), result.

### markets
Prediction markets linked to a match. Each has a question, options with odds (JSONB), and status (`open` | `locked` | `settled`).

### predictions
User predictions: selected option, coins wagered, coins won (null until settled).

## API Routes

### `POST /api/predict`
Place a prediction on an open market.

**Body:** `{ market_id, selected_option_id, coins_wagered }`

**Validations:**
- User is authenticated
- Market is open
- Wager is 100-1,000
- User has enough coins
- User hasn't already predicted on this market

**Effect:** Deducts coins from user, creates prediction record.

### `POST /api/settle`
Admin-only. Settle a market with the correct outcome.

**Body:** `{ market_id, correct_option_id }`

**Effect:** Marks market as settled, calculates payouts based on odds, updates all affected users' coins, win/loss records, and streaks.

## Game Mechanics

| Mechanic | Details |
|----------|---------|
| Starting coins | 10,000 |
| Wager range | 100–1,000 per market |
| Payout | `wager * odds` (fixed odds, e.g. 2x) |
| Daily bonus | 500 coins (claim from profile page) |
| Leaderboard | Ranked by total coins, cumulative for season |
| Market lock | Markets lock when match goes live |

## Setup

### Prerequisites
- Node.js 18+
- A Supabase project
- A Google OAuth app (configured in Supabase Auth)

### 1. Clone and install
```bash
git clone https://github.com/eshan-292/sixsense.git
cd sixsense
npm install
```

### 2. Environment variables
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Supabase setup
1. Create tables: `profiles`, `matches`, `markets`, `predictions` (see schema above)
2. Enable Google OAuth in Authentication > Providers
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.vercel.app/auth/callback` (production)
4. Create a trigger to auto-create a profile when a user signs up

### 4. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Deploy
Push to `main` — Vercel auto-deploys. Make sure environment variables are set in Vercel project settings.

## Admin Usage

1. Set `is_admin = true` on your profile row in Supabase
2. Access `/admin` from the navbar
3. **Manage Matches** — add new matches or use the 70 pre-loaded IPL 2026 fixtures
4. **Create Markets** — use templates (Match Winner, Total Runs, First Innings, POTM) or create custom markets
5. **Settle Markets** — select the correct outcome after a match completes; coins are distributed automatically

## License

MIT
