
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_ad_reward() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.min_cashout(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_ad_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.min_cashout(text, integer) TO authenticated;
