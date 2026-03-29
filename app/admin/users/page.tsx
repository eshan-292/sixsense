"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { formatCoins } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export default function AdminUsersPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<(Profile & { email?: string | null })[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"coins" | "predictions" | "created">("coins");
  const [actionMsg, setActionMsg] = useState("");
  const [grantUserId, setGrantUserId] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState(1000);
  const supabase = createClient();

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) { setLoading(false); return; }
    setIsAdmin(true);

    // Fetch users with emails from admin API
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const { users: allUsers } = await res.json();
      // Sort client-side
      const orderCol = sortBy === "coins" ? "coins" : sortBy === "predictions" ? "total_predictions" : "created_at";
      allUsers.sort((a: any, b: any) => {
        if (orderCol === "created_at") return new Date(b[orderCol]).getTime() - new Date(a[orderCol]).getTime();
        return (b[orderCol] || 0) - (a[orderCol] || 0);
      });
      setUsers(allUsers);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [sortBy]);

  const handleAction = async (userId: string, action: string, value?: string) => {
    setActionMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`Done! ${action === "grant_coins" ? `+${value} coins granted` : action === "toggle_admin" ? `Admin: ${data.is_admin}` : "Coins reset to 10,000"}`);
      setGrantUserId(null);
      loadData();
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
    </div>
  );
  if (!isAdmin) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <p className="text-4xl mb-3">🔒</p>
      <p className="text-red-400">Access denied.</p>
    </div>
  );

  const filtered = search
    ? users.filter(u => u.display_name?.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div className="min-h-screen">
      <div >
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <p className="text-sm text-gray-500">{users.length} total users</p>
            </div>
            <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded-lg transition-colors">
              ← Dashboard
            </Link>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="card rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-400">{users.length}</p>
              <p className="text-[11px] text-gray-500">Total</p>
            </div>
            <div className="card rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-yellow-400">{formatCoins(users.reduce((s, u) => s + u.coins, 0))}</p>
              <p className="text-[11px] text-gray-500">Total Coins</p>
            </div>
            <div className="card rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-indigo-400">{users.reduce((s, u) => s + u.total_predictions, 0)}</p>
              <p className="text-[11px] text-gray-500">Total Predictions</p>
            </div>
            <div className="card rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-purple-400">{users.filter(u => u.is_admin).length}</p>
              <p className="text-[11px] text-gray-500">Admins</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-10">
        {actionMsg && (
          <div className={`${actionMsg.startsWith("Error") ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-green-500/10 border-green-500/20 text-green-300"} border text-sm p-3 rounded-lg mb-4`}>
            {actionMsg}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="coins">Sort: Coins</option>
            <option value="predictions">Sort: Predictions</option>
            <option value="created">Sort: Newest</option>
          </select>
        </div>

        {/* Grant coins modal */}
        {grantUserId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="card rounded-xl p-5 max-w-sm w-full border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-3">Grant Coins</h3>
              <p className="text-xs text-gray-400 mb-3">
                To: <span className="text-white font-medium">{users.find(u => u.id === grantUserId)?.display_name}</span>
              </p>
              <input
                type="number"
                value={grantAmount}
                onChange={(e) => setGrantAmount(parseInt(e.target.value) || 0)}
                min={100}
                max={100000}
                step={100}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white mb-3"
              />
              <div className="flex gap-2">
                <button onClick={() => setGrantUserId(null)} className="flex-1 text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg py-2 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(grantUserId, "grant_coins", String(grantAmount))}
                  className="flex-1 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg py-2 transition-colors"
                >
                  Grant {formatCoins(grantAmount)} Coins
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="card rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-[11px] text-gray-500 font-medium py-3 px-4 uppercase tracking-wider">User</th>
                <th className="text-right text-[11px] text-gray-500 font-medium py-3 px-4 uppercase tracking-wider">Coins</th>
                <th className="text-right text-[11px] text-gray-500 font-medium py-3 px-4 uppercase tracking-wider hidden sm:table-cell">Stats</th>
                <th className="text-right text-[11px] text-gray-500 font-medium py-3 px-4 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-gray-800/30 hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full border border-gray-700" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[11px] font-bold text-white">
                          {user.display_name?.[0] || "?"}
                        </div>
                      )}
                      <div>
                        <span className="text-sm text-white font-medium block">
                          {user.display_name}
                          {user.is_admin && (
                            <span className="text-[11px] bg-orange-500/10 text-orange-400 px-1 py-0.5 rounded ml-1.5 font-medium">Admin</span>
                          )}
                        </span>
                        {user.email && (
                          <span className="text-[11px] text-gray-500 block">{user.email}</span>
                        )}
                        <span className="text-[11px] text-gray-600">
                          Joined {new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-semibold text-yellow-400">{formatCoins(user.coins)}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs hidden sm:table-cell">
                    <span className="text-gray-400">{user.total_predictions}P</span>
                    <span className="text-gray-600 mx-0.5">/</span>
                    <span className="text-green-400">{user.total_wins}W</span>
                    <span className="text-gray-600 mx-0.5">/</span>
                    <span className="text-red-400">{user.total_losses}L</span>
                    {user.win_streak > 0 && (
                      <span className="text-orange-400 ml-1">🔥{user.win_streak}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setGrantUserId(user.id); setGrantAmount(1000); }}
                        className="text-[11px] bg-green-600/20 text-green-400 hover:bg-green-600/30 px-2 py-1 rounded transition-colors"
                        title="Grant coins"
                      >
                        +Coins
                      </button>
                      <button
                        onClick={() => handleAction(user.id, "reset_coins")}
                        className="text-[11px] bg-gray-700/50 text-gray-400 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                        title="Reset to 10,000"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => handleAction(user.id, "toggle_admin")}
                        className={`text-[11px] px-2 py-1 rounded transition-colors ${
                          user.is_admin
                            ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                            : "bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30"
                        }`}
                        title={user.is_admin ? "Remove admin" : "Make admin"}
                      >
                        {user.is_admin ? "−Admin" : "+Admin"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
