export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string;
  coins: number;
  total_predictions: number;
  total_wins: number;
  total_losses: number;
  win_streak: number;
  best_streak: number;
  last_daily_bonus: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  team_a: string;
  team_b: string;
  team_a_short: string;
  team_b_short: string;
  match_date: string;
  venue: string;
  status: "upcoming" | "live" | "completed";
  result: "team_a_win" | "team_b_win" | "no_result" | null;
  created_at: string;
}

export interface MarketOption {
  id: string;
  label: string;
  odds: number;
}

export interface Market {
  id: string;
  match_id: string;
  question: string;
  market_type: "binary" | "multiple_choice";
  options: MarketOption[];
  status: "open" | "locked" | "settled";
  correct_option_id: string | null;
  created_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  market_id: string;
  selected_option_id: string;
  coins_wagered: number;
  coins_won: number | null;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  display_name: string;
  avatar_url: string;
  coins: number;
  total_predictions: number;
  total_wins: number;
  total_losses: number;
  win_streak: number;
  best_streak: number;
}
