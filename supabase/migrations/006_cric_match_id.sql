-- Add cric_match_id to link our matches with CricketData.org match IDs
ALTER TABLE matches ADD COLUMN IF NOT EXISTS cric_match_id text;
