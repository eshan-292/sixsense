export function formatCoins(coins: number): string {
  return coins.toLocaleString("en-IN");
}

export function timeUntil(date: string): string {
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return "Started";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getTeamColor(shortName: string): string {
  const colors: Record<string, string> = {
    CSK: "bg-yellow-400 text-yellow-900",
    MI: "bg-blue-600 text-white",
    RCB: "bg-red-600 text-white",
    KKR: "bg-purple-700 text-white",
    DC: "bg-blue-500 text-white",
    SRH: "bg-orange-500 text-white",
    RR: "bg-pink-500 text-white",
    PBKS: "bg-red-500 text-white",
    GT: "bg-cyan-600 text-white",
    LSG: "bg-teal-500 text-white",
  };
  return colors[shortName] || "bg-gray-500 text-white";
}

export function getTeamBgGradient(shortName: string): string {
  const gradients: Record<string, string> = {
    CSK: "from-yellow-400/20 to-yellow-600/20",
    MI: "from-blue-500/20 to-blue-700/20",
    RCB: "from-red-500/20 to-red-700/20",
    KKR: "from-purple-500/20 to-purple-800/20",
    DC: "from-blue-400/20 to-blue-600/20",
    SRH: "from-orange-400/20 to-orange-600/20",
    RR: "from-pink-400/20 to-pink-600/20",
    PBKS: "from-red-400/20 to-red-600/20",
    GT: "from-cyan-400/20 to-cyan-700/20",
    LSG: "from-teal-400/20 to-teal-600/20",
  };
  return gradients[shortName] || "from-gray-400/20 to-gray-600/20";
}
