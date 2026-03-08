
-- Create return status enum
CREATE TYPE public.return_status AS ENUM ('in_basket', 'courier_assigned', 'en_route', 'dropped_off');

-- Create returns table
CREATE TABLE public.returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  guest_email TEXT,
  label_url TEXT,
  deadline DATE NOT NULL,
  status return_status NOT NULL DEFAULT 'in_basket',
  service_fee NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  stripe_payment_intent_id TEXT,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own returns
CREATE POLICY "Users can view own returns"
  ON public.returns FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can insert their own returns
CREATE POLICY "Users can insert own returns"
  ON public.returns FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Authenticated users can update their own returns
CREATE POLICY "Users can update own returns"
  ON public.returns FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Guest inserts (no auth required)
CREATE POLICY "Guests can insert returns"
  ON public.returns FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND guest_email IS NOT NULL);

-- Create storage bucket for labels
INSERT INTO storage.buckets (id, name, public) VALUES ('return-labels', 'return-labels', true);

-- Allow authenticated users to upload labels
CREATE POLICY "Users can upload labels"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'return-labels');

-- Allow anon to upload labels
CREATE POLICY "Guests can upload labels"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'return-labels');

-- Allow public read of labels
CREATE POLICY "Public read labels"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'return-labels');
