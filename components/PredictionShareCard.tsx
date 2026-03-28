"use client";

import { useEffect, useState } from "react";
import { formatCoins } from "@/lib/utils";

interface Props {
  matchTeams: string;
  question: string;
  selectedOption: string;
  odds: number;
  wager: number;
  potentialWin: number;
  matchUrl: string;
  onClose: () => void;
}

export default function PredictionShareCard({
  matchTeams,
  question,
  selectedOption,
  odds,
  wager,
  potentialWin,
  matchUrl,
  onClose,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Trigger slide-up animation on mount
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const shareText = `I just predicted "${selectedOption}" for ${matchTeams} on SixSense! ${formatCoins(wager)} coins at ${odds.toFixed(2)}x odds. Think you can do better?`;

  const handleWhatsApp = () => {
    const text = `\u{1F3CF} I'm predicting on SixSense! Can you beat my calls? Check out ${matchTeams} \u{1F449} ${matchUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const handleX = () => {
    const text = `Just locked in my prediction for ${matchTeams} on @SixSenseIPL \u{1F3CF}\u{1F525} Think you can do better? #IPL2026 #SixSense ${matchUrl}`;
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

      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm transition-all duration-300 ease-out ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0"
        }`}
      >
        <div className="rounded-2xl border border-indigo-500/30 bg-gray-900/95 p-6 shadow-2xl shadow-indigo-500/10"
          style={{
            background: "linear-gradient(135deg, rgba(30,27,75,0.95) 0%, rgba(17,24,39,0.98) 100%)",
          }}
        >
          {/* Gradient border glow */}
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-indigo-500/40 to-purple-500/40 -z-10 blur-sm" />

          {/* Header */}
          <div className="text-center mb-5">
            <p className="text-2xl mb-1">{"\u{1F3AF}"}</p>
            <h2 className="text-lg font-bold text-white">
              I just predicted on SixSense!
            </h2>
          </div>

          {/* Match info */}
          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-indigo-300">
              {matchTeams}
            </p>
            <p className="text-xs text-gray-400 mt-1">{question}</p>
          </div>

          {/* Selected option */}
          <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-4 mb-4 shadow-lg shadow-indigo-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">My Pick</p>
                <p className="text-base font-bold text-white">
                  {selectedOption}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Locked Odds</p>
                <p className="text-base font-bold text-indigo-400">
                  {odds.toFixed(2)}x
                </p>
              </div>
            </div>
          </div>

          {/* Wager details */}
          <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-3 mb-5">
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500">Wagered</p>
              <p className="text-sm font-bold text-yellow-400">
                {formatCoins(wager)} coins
              </p>
            </div>
            <div className="w-px h-8 bg-gray-700" />
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500">Potential Win</p>
              <p className="text-sm font-bold text-green-400">
                {formatCoins(potentialWin)} coins
              </p>
            </div>
          </div>

          {/* Share buttons */}
          <div className="space-y-2">
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              <span>{"\u{1F4F1}"}</span> Share to WhatsApp
            </button>
            <button
              onClick={handleX}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors border border-gray-700"
            >
              <span>{"\u{1D54F}"}</span> Share to X
            </button>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 text-sm font-medium py-2.5 rounded-lg transition-colors border border-gray-700/50"
            >
              <span>{"\u{1F4CB}"}</span> {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300 py-2 transition-colors"
          >
            Close
          </button>

          {/* Branding */}
          <div className="text-center mt-2">
            <p className="text-[10px] text-gray-600">
              SixSense — IPL Prediction Game
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
