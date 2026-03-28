import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Play | SixSense",
  description:
    "Learn how SixSense works — predict IPL match outcomes, wager virtual coins, and climb the leaderboard.",
};

const SECTIONS = [
  {
    title: "The Basics",
    items: [
      {
        icon: "\u{1F3CF}",
        title: "Pick a Match",
        description:
          "Browse upcoming IPL matches. Only the next scheduled match is open for predictions — future matches stay locked until it\u2019s their turn.",
      },
      {
        icon: "\u{1F3AF}",
        title: "Make Predictions",
        description:
          "Each match has multiple markets grouped by difficulty: Safe Picks, Smart Calls, and Bold Predictions. Choose an option in any market to place your prediction.",
      },
      {
        icon: "\u{1FA99}",
        title: "Wager Coins",
        description:
          "You start with 10,000 virtual coins. Wager 100\u20131,000 coins per prediction. No real money — ever!",
      },
    ],
  },
  {
    title: "How Odds Work",
    items: [
      {
        icon: "\u{1F4CA}",
        title: "Crowd-Driven Odds",
        description:
          "Odds start equal for all options (e.g., 2.00x for a 2-way market). As people bet, odds shift: popular picks drop (lower payout), underdogs rise (higher payout). The crowd sets the price.",
      },
      {
        icon: "\u26A1",
        title: "Lock In Early",
        description:
          "When you bet, you lock in the odds at that moment. If you bet early on an underdog at 3.5x and it later drops to 2.0x, you still get 3.5x if you win. Early conviction is rewarded.",
      },
      {
        icon: "\u{1F4B0}",
        title: "Payouts",
        description:
          "If you bet 200 coins at 2.5x odds: Win \u2192 you get 500 coins back (200 \u00D7 2.5). Lose \u2192 you lose your 200 coins. Higher odds = higher risk, higher reward.",
      },
    ],
  },
  {
    title: "Market Tiers & SSR",
    items: [
      {
        icon: "\u{1F7E2}",
        title: "Safe Picks \u2014 Easy questions",
        description:
          "Simple markets like \u201CWho will win?\u201D. Lower risk. Earn +10 SSR for each correct prediction.",
      },
      {
        icon: "\u{1F7E1}",
        title: "Smart Calls \u2014 Medium difficulty",
        description:
          "Markets like \u201CWill total runs exceed 350?\u201D. Moderate risk. Earn +25 SSR for each correct prediction.",
      },
      {
        icon: "\u{1F534}",
        title: "Bold Predictions \u2014 Hard questions",
        description:
          "Markets like \u201CWho will be top scorer?\u201D. High risk, high reward. Earn +50 SSR for each correct prediction.",
      },
      {
        icon: "\u2B50",
        title: "SixSense Rating (SSR)",
        description:
          "SSR measures prediction skill, separate from coins. Correct predictions earn SSR based on tier. Wrong predictions cost \u22123 SSR. Build a streak for multiplied SSR: 3+ streak = 1.5x, 5+ streak = 2x.",
      },
    ],
  },
  {
    title: "Parlays & Combos",
    items: [
      {
        icon: "\u{1F525}",
        title: "Parlay Builder",
        description:
          "Combine 2\u20134 predictions into a single parlay bet. All picks must be correct to win, but the odds multiply together for massive payouts. Wager up to 2,000 coins on a parlay.",
      },
      {
        icon: "\u{1F9EE}",
        title: "Example",
        description:
          "Pick 3 markets at 2.0x, 1.8x, and 2.5x \u2192 combined 9.0x. Bet 500 coins \u2192 win 4,500 if all 3 are correct!",
      },
    ],
  },
  {
    title: "Economy & Safety Nets",
    items: [
      {
        icon: "\u{1F381}",
        title: "Daily Bonus",
        description:
          "Make at least one prediction per day to earn 500 bonus coins automatically. Shows up in your first prediction of the day.",
      },
      {
        icon: "\u{1F6E1}\uFE0F",
        title: "Safety Net",
        description:
          "If your balance drops below 1,000 coins after a bet, you\u2019re automatically refilled to 2,000 coins. You can never truly go broke!",
      },
      {
        icon: "\u{1F3C6}",
        title: "Leaderboard",
        description:
          "Compete across 4 leaderboards: Top Predictors (SSR), Richest (Coins), Hot Streak, and Today\u2019s Best. Climb the ranks throughout the IPL season.",
      },
    ],
  },
];

const STRATEGIES = [
  {
    icon: "\u{1F9E0}",
    text: "Bet early on options you believe in \u2014 you\u2019ll lock in better odds before the crowd catches on.",
  },
  {
    icon: "\u{1F4C9}",
    text: "Lower odds (1.3x\u20131.8x) mean the crowd thinks it\u2019s likely. Higher odds (3x+) mean it\u2019s an underdog. Use this to gauge consensus.",
  },
  {
    icon: "\u{1F3B2}",
    text: "Spread your coins across multiple markets instead of going all-in on one. Diversification reduces risk.",
  },
  {
    icon: "\u{1F4AA}",
    text: "Build streaks! Correct predictions in a row multiply your SSR earnings. A 5-streak doubles your SSR per correct pick.",
  },
  {
    icon: "\u26A1",
    text: "Use parlays sparingly for big swings. They\u2019re high-risk but the payouts can be game-changing.",
  },
  {
    icon: "\u{1FA99}",
    text: "Don\u2019t panic if you lose \u2014 the safety net keeps you in the game, and the daily bonus helps rebuild.",
  },
];

export default function HowToPlayPage() {
  return (
    <div className="min-h-screen">
      <div >
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-4 text-center">
          <h1 className="text-3xl font-bold text-white mb-1">How to Play</h1>
          <p className="text-sm text-gray-500">
            Everything you need to know about SixSense
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        {SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent" />
              <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                {section.title}
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-indigo-500/50 to-transparent" />
            </div>
            <div className="space-y-2.5">
              {section.items.map((item, idx) => (
                <div key={idx} className="card rounded-xl p-4 flex gap-3">
                  <div className="shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gray-800/50 flex items-center justify-center text-lg">
                      {item.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-0.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Strategy Tips */}
        <div className="card rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-lg">{"\u{1F4A1}"}</span> Pro Strategies
          </h3>
          <ul className="space-y-2.5">
            {STRATEGIES.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-400">
                <span className="text-base mt-[-1px]">{tip.icon}</span>
                <span className="leading-relaxed">{tip.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick reference */}
        <div className="card rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">Quick Reference</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-gray-500 mb-1">Starting Coins</p>
              <p className="text-white font-semibold">10,000</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-gray-500 mb-1">Wager Range</p>
              <p className="text-white font-semibold">100 - 1,000</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-gray-500 mb-1">Daily Bonus</p>
              <p className="text-white font-semibold">+500 coins</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-gray-500 mb-1">Safety Net</p>
              <p className="text-white font-semibold">Refill to 2,000</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-gray-500 mb-1">Parlay Max</p>
              <p className="text-white font-semibold">4 picks, 2,000 coins</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-gray-500 mb-1">Wrong Prediction</p>
              <p className="text-red-400 font-semibold">-3 SSR</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Start Predicting
          </Link>
        </div>
      </div>
    </div>
  );
}
