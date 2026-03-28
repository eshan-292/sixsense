-- Add SSR fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ssr integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ssr_today integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0;

-- Add tier to markets
ALTER TABLE markets ADD COLUMN IF NOT EXISTS tier text DEFAULT 'easy' CHECK (tier IN ('easy', 'medium', 'hard'));

-- Add SSR earned to predictions
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS ssr_earned integer DEFAULT 0;

-- Create parlays table
CREATE TABLE IF NOT EXISTS parlays (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  match_id uuid REFERENCES matches(id) NOT NULL,
  predictions jsonb NOT NULL,
  coins_wagered integer NOT NULL,
  combined_odds numeric(6,2) NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'partial')),
  coins_won integer,
  ssr_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on parlays
ALTER TABLE parlays ENABLE ROW LEVEL SECURITY;

-- Users can read their own parlays
CREATE POLICY "Users can read own parlays" ON parlays FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own parlays
CREATE POLICY "Users can insert own parlays" ON parlays FOR INSERT WITH CHECK (auth.uid() = user_id);
