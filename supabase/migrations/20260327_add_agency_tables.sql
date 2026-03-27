-- Create agencies table for multi-org management
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add agency_id to organizations (orgs created by an agency)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Add agency_id to profiles (agency owner users)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agencies_owner_user_id ON agencies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_agencies_stripe_customer_id ON agencies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_agency_id ON organizations(agency_id);
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON profiles(agency_id);

-- RLS policies for agencies
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Agency owners can read their own agency
CREATE POLICY "Agency owners can view their agency"
  ON agencies FOR SELECT
  USING (owner_user_id = auth.uid());

-- Agency owners can update their agency
CREATE POLICY "Agency owners can update their agency"
  ON agencies FOR UPDATE
  USING (owner_user_id = auth.uid());

-- Service role can do anything (for admin/webhook operations)
CREATE POLICY "Service role full access to agencies"
  ON agencies FOR ALL
  USING (auth.role() = 'service_role');
