/*
# Add blood bank needs board, donation camps and donor appointments

1. New Tables
- `blood_banks`: partner blood banks shown in the directory (name, area, address, phone).
- `blood_bank_needs`: current blood group requirements per blood bank (blood group, urgency, units needed, last updated time). One current row per blood bank and blood group.
- `donation_camps`: upcoming blood donation camps (title, organizer, organizer phone, venue, area, description, start and end time).
- `camp_registrations`: a signed-in user's registration for a camp. One registration per user per camp.
- `appointments`: a signed-in user's donation appointment at a blood bank (date, time slot, status). Cancelling sets status to cancelled so history is kept.

2. Seed Data
- Adds sample blood banks, blood requirements and donation camps in Bengaluru so the new boards have content. Fixed IDs make re-running safe.

3. Security
- Row level security is enabled on all five tables.
- `blood_banks`, `blood_bank_needs` and `donation_camps` are public read-only for visitors and signed-in users. No client writes are allowed.
- `camp_registrations` and `appointments` are for signed-in users only. Each user can read, create and change only their own rows. Camp registrations can also be removed by their owner.
- Appointments are never deleted by the app.

4. Important Notes
- A partial unique index prevents two scheduled appointments in the same blood bank, date and time slot.
- Time slots must be in HH:MM 24-hour format.
- The owner column defaults to the signed-in user so inserts succeed without passing it.
*/

CREATE TABLE IF NOT EXISTS blood_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blood_bank_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_bank_id uuid NOT NULL REFERENCES blood_banks(id) ON DELETE CASCADE,
  blood_group text NOT NULL CHECK (blood_group IN ('O+','A+','B+','AB+','O-','A-','B-','AB-')),
  urgency text NOT NULL CHECK (urgency IN ('today','urgent','critical')),
  units_needed integer NOT NULL CHECK (units_needed > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blood_bank_id, blood_group)
);

CREATE TABLE IF NOT EXISTS donation_camps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  organizer text NOT NULL,
  organizer_phone text NOT NULL,
  venue text NOT NULL,
  area text NOT NULL,
  description text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS donation_camps_ends_at_idx ON donation_camps (ends_at);

CREATE TABLE IF NOT EXISTS camp_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES donation_camps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (camp_id, user_id)
);

CREATE INDEX IF NOT EXISTS camp_registrations_user_id_idx ON camp_registrations (user_id);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_bank_id uuid NOT NULL REFERENCES blood_banks(id),
  appointment_date date NOT NULL,
  time_slot text NOT NULL CHECK (time_slot ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON appointments (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_slot_taken_idx
  ON appointments (blood_bank_id, appointment_date, time_slot)
  WHERE status = 'scheduled';

ALTER TABLE blood_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_bank_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON blood_banks, blood_bank_needs, donation_camps TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON camp_registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON appointments TO authenticated;

DROP POLICY IF EXISTS "Public can read blood banks" ON blood_banks;
CREATE POLICY "Public can read blood banks" ON blood_banks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can read blood bank needs" ON blood_bank_needs;
CREATE POLICY "Public can read blood bank needs" ON blood_bank_needs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can read donation camps" ON donation_camps;
CREATE POLICY "Public can read donation camps" ON donation_camps FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users can view own camp registrations" ON camp_registrations;
CREATE POLICY "Users can view own camp registrations" ON camp_registrations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can register for camps" ON camp_registrations;
CREATE POLICY "Users can register for camps" ON camp_registrations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can cancel own camp registrations" ON camp_registrations;
CREATE POLICY "Users can cancel own camp registrations" ON camp_registrations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
CREATE POLICY "Users can view own appointments" ON appointments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can book own appointments" ON appointments;
CREATE POLICY "Users can book own appointments" ON appointments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can change own appointments" ON appointments;
CREATE POLICY "Users can change own appointments" ON appointments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO blood_banks (id, name, area, address, phone) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Manipal Hospital Blood Bank', 'Old Airport Road', '98 HAL Airport Road, Bengaluru', '+91 80 0000 0001'),
  ('a1000000-0000-4000-8000-000000000002', 'Apollo Blood Centre', 'Sheshadripuram', '21 Sheshadri Road, Bengaluru', '+91 80 0000 0002'),
  ('a1000000-0000-4000-8000-000000000003', 'Fortis Blood Bank', 'Bannerghatta Road', '154 Bannerghatta Road, Bengaluru', '+91 80 0000 0003'),
  ('a1000000-0000-4000-8000-000000000004', 'Indiranagar Community Blood Bank', 'Indiranagar', '12th Main Road, Indiranagar, Bengaluru', '+91 80 0000 0004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO blood_bank_needs (blood_bank_id, blood_group, urgency, units_needed, updated_at) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'O+', 'critical', 3, now() - interval '12 minutes'),
  ('a1000000-0000-4000-8000-000000000001', 'A-', 'today', 2, now() - interval '46 minutes'),
  ('a1000000-0000-4000-8000-000000000001', 'B+', 'urgent', 4, now() - interval '2 hours'),
  ('a1000000-0000-4000-8000-000000000002', 'A+', 'urgent', 5, now() - interval '8 minutes'),
  ('a1000000-0000-4000-8000-000000000002', 'O-', 'critical', 2, now() - interval '25 minutes'),
  ('a1000000-0000-4000-8000-000000000002', 'AB+', 'today', 1, now() - interval '3 hours'),
  ('a1000000-0000-4000-8000-000000000003', 'B+', 'today', 3, now() - interval '1 hour'),
  ('a1000000-0000-4000-8000-000000000003', 'O+', 'urgent', 2, now() - interval '5 hours'),
  ('a1000000-0000-4000-8000-000000000004', 'AB-', 'today', 2, now() - interval '35 minutes'),
  ('a1000000-0000-4000-8000-000000000004', 'A+', 'today', 4, now() - interval '4 hours'),
  ('a1000000-0000-4000-8000-000000000004', 'B-', 'urgent', 3, now() - interval '90 minutes')
ON CONFLICT (blood_bank_id, blood_group) DO NOTHING;

INSERT INTO donation_camps (id, title, organizer, organizer_phone, venue, area, description, starts_at, ends_at) VALUES
  ('b2000000-0000-4000-8000-000000000001', 'Indiranagar Community Blood Drive', 'Indiranagar Rotary Club', '+91 80 0000 0101', 'Community Hall, 100 Feet Road', 'Indiranagar', 'A morning drive open to first-time and regular donors. Free health screening included.', '2026-11-14 09:30:00+05:30', '2026-11-14 16:00:00+05:30'),
  ('b2000000-0000-4000-8000-000000000002', 'Save a Life Donation Camp', 'Bengaluru Youth Health Forum', '+91 80 0000 0102', 'St. Johns Parish Hall', 'Koramangala', 'Walk in with a valid photo ID. Refreshments are served after donation.', '2026-11-21 10:00:00+05:30', '2026-11-21 17:00:00+05:30'),
  ('b2000000-0000-4000-8000-000000000003', 'Winter Blood Donation Drive', 'Whitefield Techies Donate', '+91 80 0000 0103', 'ITPL Main Road Tech Park Lobby', 'Whitefield', 'Corporate-friendly drive with flexible slots for employees and visitors.', '2026-12-05 08:30:00+05:30', '2026-12-05 15:30:00+05:30')
ON CONFLICT (id) DO NOTHING;
