-- Driver Verification and DVLA Check Code workflow
-- Run this after your bookings table exists.

CREATE TABLE IF NOT EXISTS driver_verifications (
  verification_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  driving_licence_number TEXT NOT NULL,
  dvla_check_code TEXT NOT NULL,
  licence_front_file TEXT,
  licence_back_file TEXT,
  proof_of_address_file TEXT,
  verification_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  checked_by_admin UUID REFERENCES auth.users(id),
  checked_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE driver_verifications IS
  'Stores private driver verification data. Access is restricted by RLS and uploaded files are kept in a private Storage bucket.';
COMMENT ON COLUMN driver_verifications.driving_licence_number IS
  'Sensitive personal data. Keep RLS enabled and consider database/column encryption or Supabase Vault in production.';
COMMENT ON COLUMN driver_verifications.dvla_check_code IS
  'Sensitive DVLA check code. Do not expose publicly.';

CREATE TABLE IF NOT EXISTS driver_verification_notifications (
  notification_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID REFERENCES driver_verifications(verification_id) ON DELETE SET NULL,
  booking_id TEXT,
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('submitted', 'approved', 'rejected')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE driver_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_verification_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can create their own driver verification" ON driver_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Customers can view their own driver verification" ON driver_verifications
  FOR SELECT USING (
    auth.uid() = user_id OR auth.jwt() ->> 'email' = 'kavotechuk@gmail.com'
  );

CREATE POLICY "Customers can update pending own driver verification" ON driver_verifications
  FOR UPDATE USING (
    auth.uid() = user_id AND verification_status = 'PENDING'
  )
  WITH CHECK (
    auth.uid() = user_id AND verification_status = 'PENDING'
  );

CREATE POLICY "Admin can manage all driver verifications" ON driver_verifications
  FOR ALL USING (auth.jwt() ->> 'email' = 'kavotechuk@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'kavotechuk@gmail.com');

CREATE POLICY "Users can queue verification emails" ON driver_verification_notifications
  FOR INSERT WITH CHECK (
    recipient_email = auth.jwt() ->> 'email'
    OR auth.jwt() ->> 'email' = 'kavotechuk@gmail.com'
  );

CREATE POLICY "Admin can view verification emails" ON driver_verification_notifications
  FOR SELECT USING (auth.jwt() ->> 'email' = 'kavotechuk@gmail.com');

INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-verification-documents', 'driver-verification-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "Customers can upload own verification documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'driver-verification-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admin can read verification documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'driver-verification-documents'
    AND auth.jwt() ->> 'email' = 'kavotechuk@gmail.com'
  );

CREATE POLICY "Admin can delete verification documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'driver-verification-documents'
    AND auth.jwt() ->> 'email' = 'kavotechuk@gmail.com'
  );

CREATE INDEX IF NOT EXISTS idx_driver_verifications_user_id ON driver_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_verifications_booking_id ON driver_verifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_driver_verifications_status ON driver_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_driver_verification_notifications_verification_id ON driver_verification_notifications(verification_id);

CREATE OR REPLACE FUNCTION update_driver_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_driver_verifications_updated_at ON driver_verifications;
CREATE TRIGGER update_driver_verifications_updated_at
  BEFORE UPDATE ON driver_verifications
  FOR EACH ROW EXECUTE FUNCTION update_driver_verifications_updated_at();
