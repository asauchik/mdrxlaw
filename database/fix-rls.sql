-- Temporarily disable RLS for testing
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clio_tokens DISABLE ROW LEVEL SECURITY;

-- Alternative: Update policies to be more permissive
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can manage their tokens" ON clio_tokens;

CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on tokens" ON clio_tokens
    FOR ALL USING (true) WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clio_tokens ENABLE ROW LEVEL SECURITY;
