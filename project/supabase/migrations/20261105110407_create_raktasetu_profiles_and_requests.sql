/*
# Create RaktaSetu profiles and blood requests

1. New Tables
- `profiles` stores the signed-in user's RaktaSetu profile, including full name, phone number, date of birth, role, blood group, location, and donor availability.
- `blood_requests` stores blood requests created by signed-in requesters, including blood group, hospital, location, urgency, and status.

2. Security
- Row level security is enabled on both tables.
- Profiles can only be read or changed by their owner.
- Authenticated users can create and manage their own blood requests.
- Authenticated users can view active blood requests so donors can discover nearby help requests.
- Data API access is granted only to authenticated users for the operations used by the app.

3. Important Notes
- Both tables use `auth.uid()` defaults so the browser does not need to pass ownership identifiers.
- The migration is idempotent and safe to re-apply.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  date_of_birth date NOT NULL,
  role text NOT NULL CHECK (role IN ('donor', 'requester')),
  blood_group text NOT NULL CHECK (blood_group IN ('O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-')),
  location text NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blood_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  blood_group text NOT NULL CHECK (blood_group IN ('O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-')),
  hospital text NOT NULL,
  location text NOT NULL,
  urgency text NOT NULL CHECK (urgency IN ('today', 'urgent', 'critical')),
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'fulfilled', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_requests TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "requests_select_authenticated" ON public.blood_requests;
CREATE POLICY "requests_select_authenticated" ON public.blood_requests FOR SELECT TO authenticated USING (status IN ('open', 'matched') OR auth.uid() = user_id);
DROP POLICY IF EXISTS "requests_insert_own" ON public.blood_requests;
CREATE POLICY "requests_insert_own" ON public.blood_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "requests_update_own" ON public.blood_requests;
CREATE POLICY "requests_update_own" ON public.blood_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "requests_delete_own" ON public.blood_requests;
CREATE POLICY "requests_delete_own" ON public.blood_requests FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS blood_requests_status_created_at_idx ON public.blood_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS blood_requests_blood_group_idx ON public.blood_requests(blood_group);
