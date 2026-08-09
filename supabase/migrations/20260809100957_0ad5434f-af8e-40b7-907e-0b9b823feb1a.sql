-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own roles select" ON public.user_roles;
CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- PIN columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS withdrawal_pin text,
  ADD COLUMN IF NOT EXISTS pin_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS pin_used boolean NOT NULL DEFAULT false;

-- Daily task completions
CREATE TABLE IF NOT EXISTS public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_key text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL,
  completed_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_key, completed_on)
);
GRANT SELECT ON public.task_completions TO authenticated;
GRANT ALL ON public.task_completions TO service_role;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own task completions select" ON public.task_completions;
CREATE POLICY "own task completions select" ON public.task_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins read task completions" ON public.task_completions;
CREATE POLICY "admins read task completions" ON public.task_completions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- PIN purchases
CREATE TABLE IF NOT EXISTS public.pin_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  currency text NOT NULL,
  pin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pin_purchases TO authenticated;
GRANT ALL ON public.pin_purchases TO service_role;
ALTER TABLE public.pin_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own pin purchases select" ON public.pin_purchases;
CREATE POLICY "own pin purchases select" ON public.pin_purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins read pin purchases" ON public.pin_purchases;
CREATE POLICY "admins read pin purchases" ON public.pin_purchases FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Admin read/manage policies
DROP POLICY IF EXISTS "admins read profiles" ON public.profiles;
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins read withdrawals" ON public.withdrawals;
CREATE POLICY "admins read withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins update withdrawals" ON public.withdrawals;
CREATE POLICY "admins update withdrawals" ON public.withdrawals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT UPDATE ON public.withdrawals TO authenticated;

-- Reward + minimum helpers
CREATE OR REPLACE FUNCTION public.task_reward(_currency text)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _currency WHEN 'USD' THEN 2.5 WHEN 'EUR' THEN 2.3 WHEN 'GBP' THEN 2.0 ELSE 3500 END::numeric;
$$;

CREATE OR REPLACE FUNCTION public.min_cashout(_currency text, _completed integer)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _currency WHEN 'USD' THEN 25 WHEN 'EUR' THEN 23 WHEN 'GBP' THEN 20 ELSE 35000 END::numeric;
$$;

DROP FUNCTION IF EXISTS public.claim_ad_reward();

CREATE OR REPLACE FUNCTION public.complete_task(_task_key text)
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles; reward numeric;
BEGIN
  IF _task_key NOT IN ('task1','task2','task3','task4','task5') THEN
    RAISE EXCEPTION 'Unknown task';
  END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF p IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.task_completions
    WHERE user_id = p.id AND task_key = _task_key
      AND completed_on = (now() AT TIME ZONE 'utc')::date
  ) THEN
    RAISE EXCEPTION 'You already completed this task today';
  END IF;
  reward := public.task_reward(p.currency);
  INSERT INTO public.task_completions (user_id, task_key, amount, currency)
  VALUES (p.id, _task_key, reward, p.currency);
  UPDATE public.profiles SET balance = balance + reward, last_claim_at = now()
  WHERE id = p.id RETURNING * INTO p;
  RETURN p;
END; $$;

-- Withdrawal now requires a valid unused PIN
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric);
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount numeric, _pin text, _bank_name text, _account_number text, _account_name text
) RETURNS public.withdrawals LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles; w public.withdrawals; minimum numeric;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF p IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF p.withdrawal_pin IS NULL OR p.pin_used THEN RAISE EXCEPTION 'Buy a withdrawal PIN first'; END IF;
  IF _pin IS NULL OR btrim(_pin) <> p.withdrawal_pin THEN RAISE EXCEPTION 'Invalid withdrawal PIN'; END IF;
  IF btrim(coalesce(_bank_name,'')) = '' OR btrim(coalesce(_account_number,'')) = ''
     OR btrim(coalesce(_account_name,'')) = '' THEN
    RAISE EXCEPTION 'Complete all bank details';
  END IF;
  minimum := public.min_cashout(p.currency, p.completed_withdrawals);
  IF _amount < minimum THEN RAISE EXCEPTION 'Amount is below the minimum payout'; END IF;
  IF _amount > p.balance THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawals WHERE user_id = p.id AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending payout request';
  END IF;
  UPDATE public.profiles
     SET balance = balance - _amount,
         pin_used = true,
         bank_name = btrim(_bank_name),
         account_number = btrim(_account_number),
         account_name = btrim(_account_name)
   WHERE id = p.id;
  INSERT INTO public.withdrawals (user_id, amount, currency, bank_name, account_number, account_name)
  VALUES (p.id, _amount, p.currency, btrim(_bank_name), btrim(_account_number), btrim(_account_name))
  RETURNING * INTO w;
  RETURN w;
END; $$;