
-- Add building_address to returns
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS building_address text;

-- User roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can view all roles
CREATE POLICY "Admins can view roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Delivery batches table
CREATE TABLE public.delivery_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  access_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  delivery_api_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_batches ENABLE ROW LEVEL SECURITY;

-- Admins can manage batches
CREATE POLICY "Admins can view batches" ON public.delivery_batches
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update batches" ON public.delivery_batches
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Junction table: batch <-> returns
CREATE TABLE public.batch_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.delivery_batches(id) ON DELETE CASCADE NOT NULL,
  return_id uuid REFERENCES public.returns(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (return_id)
);

ALTER TABLE public.batch_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view batch_returns" ON public.batch_returns
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin policy: view ALL returns
CREATE POLICY "Admins can view all returns" ON public.returns
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin policy: update ALL returns
CREATE POLICY "Admins can update all returns" ON public.returns
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
