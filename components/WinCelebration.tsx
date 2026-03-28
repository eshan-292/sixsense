"use client";

import { useEffect, useState } from "react";
import { formatCoins } from "@/lib/utils";

interface Props {
  matchTeams: string;
  question: string;
  selectedOption: string;
  odds: number;
  coinsWagered: number;
  coinsWon: number;
  ssrEarned: number;
  matchUrl: string;
  onClose: () => void;
}

export default function WinCelebration({
  matchTeams,
  question,
  selectedOption,
  odds,
  coinsWagered,
  coinsWon,
  ssrEarned,
  matchUrl,
  onClose,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleWhatsApp = () => {
    const text = `\u{1F3CF} I just won ${formatCoins(coinsWon)} coins on SixSense predicting ${matchTeams}! Can you beat my calls? \u{1F449} ${matchUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const handleX = () => {
    const text = `Just won ${formatCoins(coinsWon)} coins predicting ${matchTeams} on @SixSenseIPL \u{1F3CF}\u{1F525} Think you can do better? #IPL2026 #SixSense ${matchUrl}`;
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(matchUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Confetti */}
      {visible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <span
              key={i}
              className="confetti-dot"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.8}s`,
                animationDuration: `${1.5 + Math.random() * 2}s`,
                backgroundColor: [
                  "#818cf8", "#a78bfa", "#f472b6", "#34d399",
                  "#fbbf24", "#fb923c", "#60a5fa", "#f87171",
                ][i % 8],
              }}
            />
          ))}
        </div>
      )}

      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm transition-all duration-300 ease-out ${
          visible
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-8 opacity-0 scale-95"
        }`}
      >
        <div
          className="rounded-2xl border border-green-500/30 bg-gray-900/95 p-6 shadow-2xl shadow-green-500/10"
          style={{
            background: "linear-gradient(135deg, rgba(6,78,59,0.3) 0%, rgba(17,24,39,0.98) 50%)",
          }}
        >
          {/* Gradient border glow */}
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-green-500/40 to-emerald-500/40 -z-10 blur-sm" />

          {/* Header */}
          <div className="text-center mb-5">
            <p className="text-4xl mb-2">{"\u{1F389}"}</p>
            <h2 className="text-2xl font-bold text-white">You Won!</h2>
            <p className="text-3xl font-bold text-green-400 mt-1">
              +{formatCoins(coinsWon)} coins
            </p>
          </div>

          {/* Prediction details */}
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 mb-4">
            <p className="text-xs text-gray-400 mb-1">{matchTeams}</p>
            <p className="text-sm text-gray-300 mb-2">{question}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Your Pick</p>
                <p className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="text-green-400">{"\u2713"}</span>
                  {selectedOption}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Odds</p>
                <p className="text-sm font-bold text-green-400">
                  {odds.toFixed(2)}x
                </p>
              </div>
            </div>
          </div>

          {/* Payout breakdown */}
          <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-3 mb-4">
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500">Wagered</p>
              <p className="text-sm font-bold text-yellow-400">
                {formatCoins(coinsWagered)}
              </p>
            </div>
            <div className="w-px h-8 bg-gray-700" />
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500">Payout</p>
              <p className="text-sm font-bold text-green-400">
                {formatCoins(coinsWon)}
              </p>
            </div>
          </div>

          {/* SSR Badge */}
          {ssrEarned > 0 && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-purple-500/10 border border-purple-500/20 p-2.5 mb-4">
              <span className="text-purple-400 text-sm font-bold">
                +{ssrEarned} SSR Earned
              </span>
              <span className="text-[11px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                SixSense Rating
              </span>
            </div>
          )}

          {/* Share buttons */}
          <div className="space-y-2">
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              <span>{"\u{1F4F1}"}</span> Share Win to WhatsApp
            </button>
            <button
              onClick={handleX}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors border border-gray-700"
            >
              <span>{"\u{1D54F}"}</span> Share Win to X
            </button>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 text-sm font-medium py-2.5 rounded-lg transition-colors border border-gray-700/50"
            >
              <span>{"\u{1F4CB}"}</span> {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          {/* Close */}
          <button
            onClick={handleClose}
            className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300 py-2 transition-colors"
          >
            Close
          </button>

          {/* Branding */}
          <div className="text-center mt-2">
            <p className="text-[11px] text-gray-600">
              SixSense — IPL Prediction Game
            </p>
          </div>
        </div>
      </div>

      {/* Confetti CSS */}
      <style jsx>{`
        .confetti-dot {
          position: absolute;
          top: -10px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: confetti-fall linear forwards;
          opacity: 0;
        }
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
