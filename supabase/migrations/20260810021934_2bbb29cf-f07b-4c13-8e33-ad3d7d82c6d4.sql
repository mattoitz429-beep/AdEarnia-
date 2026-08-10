ALTER TABLE public.task_completions ADD COLUMN IF NOT EXISTS proof text;

CREATE OR REPLACE FUNCTION public.min_cashout(_currency text, _completed integer)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _currency WHEN 'USD' THEN 12.5 WHEN 'EUR' THEN 11.5 WHEN 'GBP' THEN 10 ELSE 17500 END::numeric;
$$;

CREATE OR REPLACE FUNCTION public.pin_price(_currency text, _payout numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT round((_payout * 0.10)::numeric, 2);
$$;

CREATE OR REPLACE FUNCTION public.complete_task(_task_key text, _proof text DEFAULT NULL)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles; reward numeric;
BEGIN
  IF _task_key NOT IN ('task1','task2','task3','task4','task5') THEN
    RAISE EXCEPTION 'Unknown task';
  END IF;
  IF _task_key IN ('task1','task2') AND length(btrim(coalesce(_proof,''))) < 3 THEN
    RAISE EXCEPTION 'Submit proof (your username or post link) to claim this task';
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
  INSERT INTO public.task_completions (user_id, task_key, amount, currency, proof)
  VALUES (p.id, _task_key, reward, p.currency, btrim(_proof));
  UPDATE public.profiles SET balance = balance + reward, last_claim_at = now()
  WHERE id = p.id RETURNING * INTO p;
  RETURN p;
END; $$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _pin text, _bank_name text, _account_number text, _account_name text)
RETURNS withdrawals LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles; w public.withdrawals; minimum numeric; paid numeric; required numeric;
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

  SELECT amount INTO paid FROM public.pin_purchases
   WHERE user_id = p.id AND pin = p.withdrawal_pin
   ORDER BY created_at DESC LIMIT 1;
  required := public.pin_price(p.currency, _amount);
  IF paid IS NULL OR paid + 0.01 < required THEN
    RAISE EXCEPTION 'Your PIN only covers a lower payout tier. Buy the PIN for this tier.';
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.complete_task(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text, text) FROM anon;