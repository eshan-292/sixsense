-- Add locked_odds to predictions (stores the dynamic odds at time of bet)
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS locked_odds numeric(6,2);
