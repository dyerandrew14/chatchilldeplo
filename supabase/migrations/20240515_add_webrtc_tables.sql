-- Create signaling table for WebRTC
CREATE TABLE IF NOT EXISTS signaling (
  id BIGSERIAL PRIMARY KEY,
  message JSONB NOT NULL,
  room_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '5 minutes') NOT NULL
);

-- Create index on room_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_signaling_room_id ON signaling(room_id);

-- Create index on expires_at for cleanup
CREATE INDEX IF NOT EXISTS idx_signaling_expires_at ON signaling(expires_at);

-- Create matchmaking table
CREATE TABLE IF NOT EXISTS matchmaking (
  id TEXT PRIMARY KEY REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('searching', 'matched', 'idle')),
  country TEXT NOT NULL,
  gender TEXT NOT NULL,
  interests TEXT[] DEFAULT '{}',
  lobby TEXT NOT NULL,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on status for faster matchmaking queries
CREATE INDEX IF NOT EXISTS idx_matchmaking_status ON matchmaking(status);

-- Create index on last_active for cleanup
CREATE INDEX IF NOT EXISTS idx_matchmaking_last_active ON matchmaking(last_active);

-- Create function to clean up expired signaling messages
CREATE OR REPLACE FUNCTION cleanup_expired_signaling()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM signaling WHERE expires_at < now();
END;
$$;

-- Create function to clean up inactive matchmaking entries
CREATE OR REPLACE FUNCTION cleanup_inactive_matchmaking()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE matchmaking 
  SET status = 'idle'
  WHERE last_active < now() - interval '1 minute'
  AND status = 'searching';
END;
$$; 