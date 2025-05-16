-- Enable RLS on signaling table
ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert signaling messages
CREATE POLICY "Allow authenticated users to insert signaling messages"
ON signaling FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to read signaling messages in their rooms
CREATE POLICY "Allow authenticated users to read signaling messages in their rooms"
ON signaling FOR SELECT TO authenticated
USING (
  room_id LIKE auth.uid() || '%' OR 
  room_id LIKE '%' || auth.uid()
);

-- Enable RLS on matchmaking table
ALTER TABLE matchmaking ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to update their own matchmaking status
CREATE POLICY "Allow users to update their own matchmaking status"
ON matchmaking FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow authenticated users to read other users' matchmaking status
CREATE POLICY "Allow users to read other users' matchmaking status"
ON matchmaking FOR SELECT TO authenticated
USING (true); 