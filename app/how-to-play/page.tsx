import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Play",
  description:
    "Learn how SixSense works — predict IPL match outcomes, wager virtual coins, and climb the leaderboard.",
};

const RULES = [
  {
    icon: "🎯",
    title: "Make Predictions",
    description:
      "Browse upcoming IPL matches and pick outcomes — who will win, total runs, first innings score, and more.",
  },
  {
    icon: "🪙",
    title: "Wager Virtual Coins",
    description:
      "You start with 10,000 coins. Wager between 100-1,000 coins per prediction. No real money involved!",
  },
  {
    icon: "📊",
    title: "Watch the Odds",
    description:
      "Each option has fixed odds (e.g., 2x). If you wager 500 coins at 2x odds and win, you get 1,000 coins back.",
  },
  {
    icon: "🔒",
    title: "Predictions Lock Before Match",
    description:
      "Markets lock before the match starts. Make sure to place your predictions in time!",
  },
  {
    icon: "💰",
    title: "Win Coins",
    description:
      "When a market is settled, winners receive their payout automatically based on the odds.",
  },
  {
    icon: "🏆",
    title: "Climb the Leaderboard",
    description:
      "Your total coins determine your rank. The best predictors rise to the top throughout the IPL season.",
  },
  {
    icon: "🎁",
    title: "Daily Bonus",
    description:
      "Log in and make at least one prediction to claim 500 bonus coins every day. Visit your profile to claim!",
  },
];

export default function HowToPlayPage() {
  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-4 text-center">
          <h1 className="text-3xl font-bold text-white mb-1">How to Play</h1>
          <p className="text-sm text-gray-500">
            Everything you need to know about SixSense
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        <div className="space-y-3 mb-8">
          {RULES.map((rule, idx) => (
            <div key={idx} className="glass-card rounded-xl p-4 flex gap-4">
              <div className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center text-xl">
                  {rule.icon}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-0.5">
                  {rule.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {rule.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick tips */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Quick Tips</h3>
          <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span>
                Diversify your predictions across multiple markets to reduce risk.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span>
                Higher odds mean higher risk but bigger payouts.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span>
                Don&apos;t go all-in on a single prediction — keep coins for future matches.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span>
                Claim your daily bonus every day to build your bankroll.
              </span>
            </li>
          </ul>
        </div>

        <div className="mt-6 text-center">
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
