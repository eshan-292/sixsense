# SixSense — Feature Roadmap

## Tier 1: Viral Growth
- [ ] **Referral System** — Invite friends, both get 1,000 coins. Shareable link with referral code. Track referrals in profiles table.
- [ ] **WhatsApp Challenge CTA** — After winning a prediction, prompt "Challenge a friend" with deep-link to the match page.

## Tier 2: Daily Retention
- [ ] **Daily Challenges** — "Predict 5 markets today → 500 bonus", "Get 3 correct → 1,000 coins". Resets daily. Show on home page as a progress bar.
- [ ] **Streak Rewards UI** — Prominent flame counter on profile and navbar: "🔥 5-match streak! 2x points multiplier active". Backend already exists.

## Tier 3: Social & Competitive
- [ ] **Head-to-Head Challenges** — Challenge a specific friend on a match. Both put up coins, winner takes the pot.
- [ ] **Private Leagues** — Create a group, invite friends via code/link, private leaderboard. "Cricket with the boys."
- [ ] **Live Match Chat** — Simple chat room per match during live games. Users discuss predictions, react to events.

## Tier 4: Engagement & Time-in-App
- [ ] **In-Play Micro Predictions** — During live matches: "Will a wicket fall this over?" "Next ball boundary?" 30-second windows.
- [ ] **Prediction Accuracy Badges** — "Cricket Oracle" (80%+ win rate), "Six Sense Master" (10-match streak). Make achievements more visible.
- [ ] **Match Commentary Feed** — AI-generated commentary mixing match events with prediction outcomes.

## Infrastructure & Scaling
- [x] Fix N+1 queries (batched prediction counts)
- [x] Debounce auto-settle (5-min cooldown)
- [ ] Add Redis/caching layer for match data (when >500 users)
- [ ] Upgrade Supabase to Pro for 500 connections (when >200 concurrent)
- [ ] Server-side render prediction counts to reduce client queries
