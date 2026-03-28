"use client";

export default function ShareButton({
  text,
  url,
  matchTeams,
}: {
  text: string;
  url?: string;
  matchTeams?: string;
}) {
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const teams = matchTeams || text;

  const whatsAppText = `\u{1F3CF} I'm predicting on SixSense! Can you beat my calls? Check out ${teams} \u{1F449} ${shareUrl}`;
  const xText = `Just locked in my prediction for ${teams} on @SixSenseIPL \u{1F3CF}\u{1F525} Think you can do better? #IPL2026 #SixSense ${shareUrl}`;
  const copyText = `${text}\n\n\u{1F3CF} Play on SixSense: ${shareUrl}`;

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`,
      "_blank"
    );
  };

  const handleX = () => {
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(xText)}`,
      "_blank"
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyText);
    alert("Copied to clipboard!");
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleWhatsApp}
        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
      >
        <span>📱</span> WhatsApp
      </button>
      <button
        onClick={handleX}
        className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
      >
        <span>𝕏</span> Post
      </button>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
      >
        <span>📋</span> Copy
      </button>
    </div>
  );
}
