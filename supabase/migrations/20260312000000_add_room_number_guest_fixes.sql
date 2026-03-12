-- ============================================================
-- Migration: Add room_number + fix guest RLS for SELECT
-- ============================================================

-- 1. Add room_number column to returns table
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS room_number text;

-- 2. Allow guests (anon) to SELECT returns by guest_email
--    Needed for TrackOrder page and post-payment success flow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'returns'
      AND policyname = 'Guests can view their own returns'
  ) THEN
    CREATE POLICY "Guests can view their own returns"
      ON public.returns FOR SELECT
      TO anon
      USING (user_id IS NULL AND guest_email IS NOT NULL);
  END IF;
END$$;
