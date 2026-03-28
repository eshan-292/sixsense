-- Update wager range from 100-1000 to 10-500
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_coins_wagered_check;
ALTER TABLE predictions ADD CONSTRAINT predictions_coins_wagered_check CHECK (coins_wagered >= 10 AND coins_wagered <= 1000);

-- Also update parlays constraint if it exists
ALTER TABLE parlays DROP CONSTRAINT IF EXISTS parlays_coins_wagered_check;
ALTER TABLE parlays ADD CONSTRAINT parlays_coins_wagered_check CHECK (coins_wagered >= 10 AND coins_wagered <= 1000);
