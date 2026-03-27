"use client";

export default function ShareButton({
  text,
  url,
}: {
  text: string;
  url?: string;
}) {
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareText = `${text}\n\n🏏 Play on SixSense: ${shareUrl}`;

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank"
    );
  };

  const handleX = () => {
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      "_blank"
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
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
