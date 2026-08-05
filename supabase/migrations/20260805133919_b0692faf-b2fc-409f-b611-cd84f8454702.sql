
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'NG',
  currency text NOT NULL DEFAULT 'NGN',
  balance numeric(14,4) NOT NULL DEFAULT 0,
  completed_withdrawals integer NOT NULL DEFAULT 0,
  bank_name text,
  account_number text,
  account_name text,
  last_claim_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.ad_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,4) NOT NULL,
  currency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ad_claims TO authenticated;
GRANT ALL ON public.ad_claims TO service_role;
ALTER TABLE public.ad_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own claims select" ON public.ad_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,4) NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  bank_name text,
  account_number text,
  account_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdrawals select" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, country, currency)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'NG'),
    COALESCE(NEW.raw_user_meta_data->>'currency', 'NGN')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.claim_ad_reward()
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles; reward numeric;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF p IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF p.last_claim_at IS NOT NULL AND p.last_claim_at > now() - interval '15 seconds' THEN
    RAISE EXCEPTION 'Cooldown active';
  END IF;
  reward := CASE p.currency WHEN 'USD' THEN 0.025 WHEN 'EUR' THEN 0.02 WHEN 'GBP' THEN 0.02 ELSE 35.00 END;
  INSERT INTO public.ad_claims (user_id, amount, currency) VALUES (p.id, reward, p.currency);
  UPDATE public.profiles SET balance = balance + reward, last_claim_at = now()
  WHERE id = p.id RETURNING * INTO p;
  RETURN p;
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_ad_reward() TO authenticated;

CREATE OR REPLACE FUNCTION public.min_cashout(_currency text, _completed integer)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _currency = 'NGN' THEN
      CASE WHEN _completed = 0 THEN 500 WHEN _completed = 1 THEN 1000 ELSE 2000 + (_completed - 2) * 1000 END
    ELSE
      CASE WHEN _completed = 0 THEN 1 WHEN _completed = 1 THEN 2 ELSE 4 + (_completed - 2) * 2 END
  END::numeric;
$$;
GRANT EXECUTE ON FUNCTION public.min_cashout(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric)
RETURNS public.withdrawals LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles; w public.withdrawals; minimum numeric;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF p IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF p.bank_name IS NULL OR p.account_number IS NULL OR p.account_name IS NULL THEN
    RAISE EXCEPTION 'Add your payout account details first';
  END IF;
  minimum := public.min_cashout(p.currency, p.completed_withdrawals);
  IF _amount < minimum THEN RAISE EXCEPTION 'Amount is below your current minimum cashout'; END IF;
  IF _amount > p.balance THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawals WHERE user_id = p.id AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending payout request';
  END IF;
  UPDATE public.profiles SET balance = balance - _amount WHERE id = p.id;
  INSERT INTO public.withdrawals (user_id, amount, currency, bank_name, account_number, account_name)
  VALUES (p.id, _amount, p.currency, p.bank_name, p.account_number, p.account_name)
  RETURNING * INTO w;
  RETURN w;
END; $$;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric) TO authenticated;
